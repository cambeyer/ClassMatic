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

app.get('/download', function(req, res){
	try {
		var hash = req.query.hash;
		var activeClass = req.query.active;
		var filename;
		var files = JSON.parse(fs.readFileSync(dir + activeClass + ".json", 'utf8'));
		for (var folder in files) {		
			for (var i = 0; i < files[folder].length; i++) {
				if (files[folder][i].hash == hash && files[folder][i].reveal <= Date.now()) {
					filename = files[folder][i].name;
					break;
				}
			}
		}
		if (filename) {
			console.log("Downloading: " + hash + " -> " + filename);
			var file = dir + activeClass + "/" + hash;
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
		for (var folder in files[activeClass]) {
			for (var i = 0; i < files[activeClass][folder].length; i++) {
				if (files[activeClass][folder][i].hash == hash) {
					try {
						fs.unlinkSync(dir + activeClass + "/" + hash);
					} catch (e) {
						console.log("Could not delete " + hash);
					}
					files[activeClass][folder].splice(i, 1);
					break;
				}
			}
			if (files[activeClass][folder].length == 0) { delete files[activeClass][folder]; }
		}
		if (Object.keys(files[activeClass]).length > 0) {
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
	} catch (e) { res.send('Error'); }
	res.send('File deleted');
});

app.route('/upload')
    .post(function (req, res, next) {
        var fstream;
		var title;
		var revealDate;
		var theFolder;
        req.pipe(req.busboy);
		req.busboy.on('field',function (fieldname,val){
			if (fieldname == 'title') {
				title = val;
			} else if (fieldname == 'reveal') {
				revealDate = val;
			} else if (fieldname == 'folder') {
				theFolder = val;
			}
		});
        req.busboy.on('file', function (activeClass, file, filename) {
			try {
				fs.mkdirSync(dir + activeClass);
			} catch (e) { }
			try { 
				console.log("Uploading: " + filename);
				fstream = fs.createWriteStream(dir + filename);
				fstream.on('close', function () { 
				
					var tempfile = {};
					tempfile["name"] = filename;
					tempfile["title"] = title;
					tempfile["hash"] = crypto.createHash('md5').update(fs.readFileSync(dir + filename), 'utf8').digest('hex');
					tempfile["date"] = Date.now();
					if (revealDate) {
						tempfile["reveal"] = revealDate;
					} else {
						tempfile["reveal"] = tempfile["date"];
					}
					
					var files = getJSON(activeClass);

					try {
						console.log("Upload Finished of " + tempfile.name);
						fs.rename(dir + tempfile.name, dir + activeClass + "/" + tempfile.hash, function (err) {
							if (err) throw err;
							console.log('Renamed to ' + tempfile.hash);
							for (var folder in files[activeClass]) {
								for (var i = 0; i < files[activeClass][folder].length; i++) {
									if (files[activeClass][folder][i].hash == tempfile.hash) {
										files[activeClass][folder].splice(i, 1);
										break;
									}
								}
								if (files[activeClass][folder].length == 0) { delete files[activeClass][folder]; }
							}
							if (!files[activeClass][theFolder]) {
								files[activeClass][theFolder] = [];
							}
							files[activeClass][theFolder].push(tempfile);
							fs.writeFileSync(dir + activeClass + ".json", JSON.stringify(files[activeClass]));
							io.emit('message', files);
						});
					} catch (e) {
						console.log("Error during file save");
					}
				});
				file.pipe(fstream);
			} catch (e) {
				console.log("Error during upload");
			}
        });
		req.busboy.on('finish', function () {
			res.send('File saved');
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