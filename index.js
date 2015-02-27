var express = require('express');
var app = express();
var busboy = require('connect-busboy');
var path = require('path');
var fs = require('fs-extra');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var crypto = require('crypto');

var dir = __dirname + '/files/';

app.use(busboy());
app.use(express.static(path.join(__dirname, 'public')));

var getJSON = function(filename) {
	var data = {};
	data[filename] = {};
	try {
		var temp = JSON.parse(fs.readFileSync(dir + filename + ".json", 'utf8'));
		data[filename] = temp;
	} catch (e) {}
	return data;
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
}

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
						files.folders[parts[0]].files = [];
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
		return;
	}
}

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
	}
	return download(files.folders[filename[0]], filename.slice(1).join("/"));
}

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
}

app.get('/download', function(req, res){
	try {
		var hash = req.query.hash;
		var activeClass = req.query.active;
		var filename;
		var files = JSON.parse(fs.readFileSync(dir + activeClass + ".json", 'utf8'));
		filename = download(files, hash);
		if (filename) {
			console.log("Downloading: " + hash + " -> " + filename);
			var file = dir + activeClass + "/" + hash + ".file";
			res.setHeader('Content-disposition', 'attachment; filename=' + filename);
			var filestream = fs.createReadStream(file);
			filestream.pipe(res);
		}
	} catch (e) { res.redirect('back'); }
});

app.get('/delete', function(req, res){
	try {
		var hash = req.query.hash;
		var activeClass = req.query.active;
		var files = getJSON(activeClass);
		if (deleter(files[activeClass], hash, activeClass, "")) {
			fs.writeFileSync(dir + activeClass + ".json", JSON.stringify(files[activeClass]));
		} else {
			try {
				fs.unlinkSync(dir + activeClass + ".json");
				fs.rmdirSync(dir + activeClass);
			} catch (e) {
				console.log("Could not remove index file " + activeClass);
			}
		}
		io.emit('message', files);
		res.send('File deleted');
	} catch (e) { res.send("Error deleting"); }
});

app.route('/upload')
    .post(function (req, res, next) {
        var fstream;
		var title;
		var revealDate;
		var theFolder;
        req.pipe(req.busboy);
		req.busboy.on('field',function (fieldname, val){
			if (fieldname == 'title') {
				title = val;
			} else if (fieldname == 'reveal') {
				revealDate = val;
			} else if (fieldname == 'folder') {
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
						tempfile["title"] = title;
						tempfile["hash"] = hash.digest('hex');
						tempfile["date"] = Date.now();
						if (revealDate) {
							tempfile["reveal"] = revealDate;
						} else {
							tempfile["reveal"] = tempfile["date"];
						}
						
						var files = getJSON(activeClass);

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
								addWithoutCollisions(files[activeClass], theFolder + "/" + tempfile.hash, tempfile);
								fs.writeFileSync(dir + activeClass + ".json", JSON.stringify(files[activeClass]));
								io.emit('message', files);
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
	socket.emit('message', getJSON(msg));
  });
});

http.listen(3000, "0.0.0.0", function(){
  console.log('listening on *:3000');
});