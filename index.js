var express = require('express');
var app = express();
var busboy = require('connect-busboy');
var path = require('path');
var fs = require('fs-extra');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var crypto = require('crypto');
var lockFile = require('lockfile');

var dir = __dirname + '/files/';

var globalfiles;

app.use(busboy());
app.use(express.static(path.join(__dirname, 'public')));

var checkClassDefined = function(activeClass) {
	if (!globalfiles[activeClass]) {
		globalfiles[activeClass] = {};
	}
	return globalfiles[activeClass];
}

var justOneClass = function(activeClass) {
	var data = {};
	data[activeClass] = checkClassDefined(activeClass);
	return data;
}

var writeIndexFile = function() {
	for (var oneclass in globalfiles) {
		if (Object.keys(globalfiles[oneclass]).length == 0) {
			delete globalfiles[oneclass];
		}
	}
	if (Object.keys(globalfiles).length > 0) {
		fs.writeFileSync(dir + "files.json", JSON.stringify(globalfiles));
	} else {
		try {
			fs.unlinkSync(dir + "files.json");
		} catch (e) {
			console.log(e);
			console.log("writeIndexFile: error removing index file");
		}
	}
}

var createFolder = function(foldername, activeClass) {
	var root = dir + activeClass;
	if (foldername) {
		var parts = foldername.split("/");
		for (var i = 0; i < parts.length; i++) {
			root += "/" + parts[i];
			try {
				fs.mkdirSync(root);
			} catch (e) { }
		}
	}
	return root + "/";
};

var addWithoutCollisions = function(files, foldername, file) {
	var parts = foldername.split("/");
	if (parts.length > 1 && parts[0] !== "") {
		if (files.folders) {
			if (files.folders[parts[0]]) {
				if (parts.length == 2) {
					if (files.folders[parts[0]].files) {
						for (var i = 0; i < files.folders[parts[0]].files.length; i++) {
							if (files.folders[parts[0]].files[i].hash == file.hash) {
								files.folders[parts[0]].files.splice(i, 1);
								break;
							}
						}
						files.folders[parts[0]].files.push(file);
						return;
					} else {
						if (file) {
							files.folders[parts[0]].files = [];
						} else {
							return;
						}
						addWithoutCollisions(files, foldername, file);
					}
				} else {
					addWithoutCollisions(files.folders[parts[0]], parts.slice(1).join("/"), file);
				}
			} else {
				files.folders[parts[0]]= {};
				addWithoutCollisions(files, foldername, file);
			}
		} else {
			files.folders = {};
			addWithoutCollisions(files, foldername, file);
		}
	} else {
		if (file) {
			if (files.files) {
				for (var i = 0; i < files.files.length; i++) {
					if (files.files[i].hash == file.hash) {
						files.files.splice(i, 1);
						break;
					}
				}
			} else {
				files.files = [];
			}
			files.files.push(file);
		}
		return;
	}
};

var download = function(files, filename) {
	filename = filename.split("/");
	if (filename.length == 1) {
		if (files.files) {
			for (var i = 0; i < files.files.length; i++) {
				if (files.files[i].hash == filename[0] && files.files[i].reveal <= Date.now()) {
					return files.files[i].name;
				}
			}
		}
	} else if (filename.length > 1) {
		return download(files.folders[filename[0]], filename.slice(1).join("/"));
	}
};

var folderDeleter = function(files, path) {
	path = path.split("/");
	if (path.length == 1) {
		if (files.folders && files.folders[path[0]]) {
			delete files.folders[path[0]];
			if (Object.keys(files.folders).length == 0) {
				delete files.folders;
			}
			return;
		}
	} else if (path.length > 1) {
		return folderDeleter(files.folders[path[0]], path.slice(1).join("/"));
	}
};

var deleteFolderRecursive = function (path) {
	if (fs.existsSync(path)) {
		fs.readdirSync(path).forEach(function(file, index) {
			var curPath = path + "/" + file;
			if (fs.lstatSync(curPath).isDirectory()) {
				deleteFolderRecursive(curPath);
			} else {
				fs.unlinkSync(curPath);
			}
		});
		fs.rmdirSync(path);
	}
};

var deleter = function(files, filename, activeClass, origfilename) {
	filename = filename.split("/");
	if (filename.length == 1) {
		for (var i = 0; i < files.files.length; i++) {
			if (files.files[i].hash == filename[0]) {
				files.files.splice(i, 1);
				try {
					origfilename = origfilename == "" ? "" : origfilename + "/";
					fs.unlinkSync(dir + activeClass + "/" + origfilename + filename[0] + ".file");
				} catch (e) {
					console.log(e);
					console.log("Deleter: error removing file");
				}
				if (files.files.length == 0) {
					delete files.files;
				}
				if ((!files.files && !files.folders) || (!files.files && Object.keys(files.folders).length == 0)) {
					return false;
				}
				return true;
			}
		}
	}
	if (!deleter(files.folders[filename[0]], filename.slice(1).join("/"), activeClass, origfilename + "/" + filename[0])) {
		delete files.folders[filename[0]];
		if (Object.keys(files.folders).length == 0) {
			delete files.folders;
		}
		try {
			console.log("Removing directory: " + filename[0]);
			fs.rmdirSync(dir + activeClass + "/" + origfilename + "/" + filename[0]);
		} catch (e) {
			console.log(e);
		}
		if (!files.files && !files.folders) {
			return false;
		}
	}
	return true;
};

app.get('/download', function(req, res){
	try {
		var hash = req.query.hash;
		var activeClass = req.query.active;
		if (hash && activeClass) {
			var filename = download(checkClassDefined(activeClass), hash);
			if (filename) {
				console.log("Downloading: " + hash + " -> " + filename);
				var file = dir + activeClass + "/" + hash + ".file";
				res.setHeader('Content-disposition', 'attachment; filename=' + filename);
				var filestream = fs.createReadStream(file);
				filestream.pipe(res);
			}
		}
	} catch (e) { console.log(e); res.redirect('back'); }
});

app.get('/delete', function(req, res){
	try {
		var hash = req.query.hash;
		var activeClass = req.query.active;
		if (hash && activeClass) {
			if (!deleter(checkClassDefined(activeClass), hash, activeClass, "")) {
				try {
					delete globalfiles[activeClass];
					fs.rmdirSync(dir + activeClass);
				} catch (e) {
					console.log("Could not remove folder " + activeClass);
				}
			}
			writeIndexFile();
			io.emit('message', justOneClass(activeClass));
			res.send('File deleted');
		}
	} catch (e) { console.log(e); res.send("Error deleting"); }
});

app.get('/newfolder', function(req, res){
	try {
		var path = req.query.path;
		var activeClass = req.query.active;
		if (path && activeClass) {
			createFolder(path, activeClass);
			addWithoutCollisions(checkClassDefined(activeClass), path + "/new", null);
			writeIndexFile();
			io.emit('message', justOneClass(activeClass));
			res.send('Folder created');
		}
	} catch (e) { console.log(e); res.send("Error creating"); }
});

app.get('/deletefolder', function(req, res){
	try {
		var path = req.query.path;
		var activeClass = req.query.active;
		if (path && activeClass) {
			folderDeleter(checkClassDefined(activeClass), path);
			deleteFolderRecursive(dir + activeClass + "/" + path);
			writeIndexFile();
			io.emit('message', justOneClass(activeClass));
			res.send('Folder deleted');
		}
	} catch (e) { console.log(e); res.send("Error deleting"); }
});

app.route('/upload').post(function (req, res, next) {
	var fstream;
	//var title;
	var revealDate;
	var theFolder;
	req.pipe(req.busboy);
	req.busboy.on('field',function (fieldname, val){
		/*if (fieldname == 'title') {
			title = val;
		} else if */
		if (fieldname == 'reveal') {
			revealDate = val;
		} else if (fieldname == 'folder') {
			val = val.replace(/([^a-z \/0-9]+)/gi, '');
			if (val.length > 1 && val.substring(0, 1) == '/') {
				val = val.substring(1);
			}
			theFolder = val;
			console.log("Folder: " + theFolder);
		}
	});
	req.busboy.on('file', function (activeClass, file, filename) {
		if (filename) {
			try {
				fs.mkdirSync(dir + activeClass);
			} catch (e) { }
			try { 
				console.log("Uploading: " + filename);
				var hash = crypto.createHash('md5');
				fstream = fs.createWriteStream(dir + filename);
				file.on('data', function(chunk) {
					hash.update(chunk);
				});
				fstream.on('close', function () { 
				
					var tempfile = {};
					tempfile["name"] = filename;
					//tempfile["title"] = title;
					tempfile["hash"] = hash.digest('hex');
					tempfile["date"] = Date.now();
					if (revealDate) {
						tempfile["reveal"] = revealDate;
					} else {
						tempfile["reveal"] = tempfile["date"];
					}
					
					try {
						console.log("Upload Finished of " + tempfile.name);
						createFolder(theFolder, activeClass);
						var newName;
						if (theFolder) {
							newName = dir + activeClass + "/" + theFolder + "/" + tempfile.hash + ".file";
						} else {
							newName = dir + activeClass + "/" + tempfile.hash + ".file";
						}
						fs.rename(dir + tempfile.name, newName, function (err) {
							if (err) throw err;
							console.log('Renamed to ' + activeClass + "/" + theFolder + "/" + tempfile.hash);
							addWithoutCollisions(checkClassDefined(activeClass), theFolder + "/" + tempfile.hash, tempfile);
							writeIndexFile();
							io.emit('message', justOneClass(activeClass));
						});
					} catch (e) {
						console.log(e);
					}
				});
				file.pipe(fstream);
			} catch (e) {
				console.log("Error during upload");
			}
		} else {
			file.resume();
		}
	});
	req.busboy.on('finish', function () {
		res.writeHead(200, { Connection: 'close', Location: '/' });
		res.end();
	});
});

io.on('connection', function(socket){
  socket.on('message', function(msg) {
	console.log('Received ' + msg);
	socket.emit('message', justOneClass(msg));
  });
});

http.listen(3000, "0.0.0.0", function(){
  console.log('listening on *:3000');
  try {
	globalfiles = JSON.parse(fs.readFileSync(dir + "files.json", 'utf8'));
  } catch (e) {
	globalfiles = {};
  }
});