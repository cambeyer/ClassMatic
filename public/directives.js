//all of the user-defined Angular directives
angular.module('ClassMaticApp.directives', []).
directive('loginform', function() {
	//directive to display the login form
	//bound to the list of classes, terms, years
	//also bound to the login model and function to handle authentication
	return {
		scope: false,
		replace: true,
		restrict: 'E',
		template: '' + 
			'<form ng-submit="sendLogin()">' + 
				'<table style="background-color: #66C166; color: white; padding: 30px; padding-left: 100px; padding-right: 100px; border-radius: 10px; border: 1px solid white" cellpadding="20" cellspacing="0" border="0" align="center">' + 
					'<tr>' + 
						'<td colspan="2">' + 
							'<h2>ClassMatic Login</h2>' + 
							'<span ng-if="error" style="color: #FFCCCC"><br>Incorrect login credentials, or you are not registered for courses</span>' + 
							'<span ng-show="loading"><img src="loading.gif" style="max-width: 40px"></span>' + 
						'</td>' + 
					'</tr>' + 
					'<tr>' + 
						'<td>Banner ID:</td>' + 
						'<td>' + 
							'<input class="loginctrl" type="text" ng-model="login.sid">' + 
						'</td>' + 
					'</tr>' + 
					'<tr>' + 
						'<td>PIN:</td>' + 
						'<td>' + 
							'<input class="loginctrl" type="password" ng-model="login.pin">' + 
						'</td>' + 
					'</tr>' + 
					'<tr>' + 
						'<td>Term:</td>' + 
						'<td>' + 
							'<select ng-model="login.term" ng-options="term for term in terms" ng-init="buildTerms()" style="float: left; width: 45%"><option ng-if="false"></option></select>' + 
							'<select ng-model="login.year" ng-options="year for year in years" ng-init="buildYears()" style="float: right; width: 45%"><option ng-if="false"></option></select>' + 
						'</td>' + 
					'</tr>' + 
					'<tr>' + 
						'<td colspan="2">' + 
							'<input ng-show="false" class="button" type="submit" value="Submit">' + 
						'</td>' + 
					'</tr>' + 
				'</table>' + 
			'</form>',
		controller: function ($scope) {
		}
	};
}).
directive('viewer', function ($location) {
	//directive for inline file previewing
	//has the capability to preview images, video, audio, pdfs, and text-based documents
	//uses the Google viewer for documents, browser functionality for all others
	return {
		restrict: 'E',
		scope: false,
		replace: true,
		link: function (scope, element, attrs) {
			//builds a link to the server where this HTML is currently being served from, in the same format expected for downloading files
			var link = $location.protocol() + "://" + $location.host() + ':' + $location.port() + '/download?active=' + attrs.active + '&hash=' + attrs.hash;
			//relies on the onerror events of individual embedded elements to remove itself from the DOM
			//successful loading removes the other embedded elements from the DOM
			element.html('<div style="background-color: #F8F8F8; border: 1px solid #D8D8D8; padding: 20px; text-align: center; border-radius: 20px"><div style="padding: 0px; line-height: 0px; display: none">' +
			'<video controls preload = "auto" style="max-height: 500px; max-width: 500px" src="' + link + '" onerror="if ($(this).siblings().length == 1) { $(this).parent().css(\'display\', \'\'); } $(this).remove();" oncanplay="if (this.duration > 0) { $(this).siblings().remove(); $(this).parent().css(\'display\', \'\'); } else { if ($(this).siblings().length == 1) { $(this).parent().css(\'display\', \'\'); } $(this).remove(); }"></video>' + 
			'<img style="max-height: 400px; max-width: 400px" src="' + link + '" onerror="if ($(this).siblings().length == 1) { $(this).parent().css(\'display\', \'\'); } $(this).remove();" onload="$(this).siblings().remove(); $(this).parent().css(\'display\', \'\')">' + 
			'<iframe src="https://docs.google.com/gview?url=' + encodeURIComponent(link) + '&embedded=true" style="width:600px; height:500px;" frameborder="0" onload="if ($(this).siblings().length == 0) { $(this).parent().css(\'display\', \'\'); }"></iframe>' +
			'</div></div>');
		}
	};
}).
directive('dragAndDrop', function($rootScope) {
	//directive for dragging and dropping onto a container
	return {
		scope: false,
		restrict: 'A',
		link: function($scope, elem, attr) {
			//bind to dragenter to apply green highlighting to folder titles
			elem.bind('dragenter', function(e) {
				//don't let this event pass on to the default handlers
				e.stopPropagation();
				e.preventDefault();
				if ($scope.path && !$scope.student) {
					elem.filter('.titlebar').css('background-color', '#66C166');
				}
			});
			//bind to dragleave to remove green highlighting on folder titles
			elem.bind('dragleave', function(e) {
				//don't let this event pass on to the default handlers
				e.stopPropagation();
				e.preventDefault();
				if ($scope.path && !$scope.student) {
					elem.filter('.titlebar').css('background-color', '#F1F1F1');
				}
			});
			//bind to dragover to provide a secondary mechanism for applying green highlighting on folder titles
			elem.bind('dragover', function(e) {
				//don't let this event pass on to the default handlers
				e.stopPropagation();
				e.preventDefault();
				if ($scope.path && !$scope.student) {
					elem.filter('.titlebar').css('background-color', '#66C166');
				}
			});
			
			//auxiliary function to dynamically create a move link and click it for when a drag-drop action occurs
			var moveFile = function (elem, source) {
				var hash = source.split("/")[source.split("/").length - 1];
				var destination;
				if ($scope.path && $scope.path !== "") {
					if (!hash) {
						destination = $scope.path + source.split("/")[source.split("/").length - 2]	+ "/";
					} else {
						destination = $scope.path + hash;
					}
				} else {
					if (!hash) {
						destination = source.split("/")[source.split("/").length - 2] + "/";
					} else {
						destination = hash;
					}
				}
				if (destination.substring(0, source.length) !== source) {
					var link = document.createElement('a');
					link.href = "move?active=" + angular.element($(elem)).scope().activeClass + "&source=" + source + "&destination=" + destination;
					document.body.appendChild(link); //must be in DOM to work in Firefox
					link.target = "hidden-iframe";
					link.click();
					document.body.removeChild(link);
				}
			}
			
			//bind to the drop action
			elem.bind('drop', function(e) {
				//don't let this event pass on to the default handlers
				e.stopPropagation();
				e.preventDefault();
				if ($scope.path) {
					elem.filter('.titlebar').css('background-color', '#F1F1F1');
				}
				//check to make sure we're not in student mode
				if (!$scope.student) {
					var go = true;
					//if there is text data associated with the drop event, then interpret as a move and return
					if (e.originalEvent.dataTransfer.getData("text") && e.originalEvent.dataTransfer.getData("text") !== undefined) {
						moveFile(elem, e.originalEvent.dataTransfer.getData("text"));
						return;
					}
					//if there are already files that have been dropped onto the interface, then alert the user they will be overwritten
					if ($rootScope.fields.droppedFiles.length > 0) {
						go = confirm("This will overwrite your previously dropped files.");
					} 
					//if the user accepted the overwrite or there was no conflict, parse the files and reflect it in the interface
					if (go) {
						$rootScope.$apply(function () {
							//clear the old files that had been dropped
							$rootScope.fields.droppedFiles = [];
							var dropped = e.originalEvent.dataTransfer.files; //no originalEvent if jQuery script is included after angular
							for (var i in dropped) {
								//if the file has a type or a size that isn't a multiple of 4096 or is larger than 4096*3, then it is a file and not a folder
								//we don't want to handle folders as that functionality is not available in any browsers outside of Chrome
								if (dropped[i].type || (dropped[i].size && (dropped[i].size % 4096 !== 0 || dropped[i].size / 4096 > 3))) {
									$rootScope.fields.droppedFiles.push(dropped[i]);
								}
							}
							if ($rootScope.fields.droppedFiles.length > 0) {
								//if we're not in the upload pane already then open it and overwrite the folder
								if ($rootScope.fields.upload == false) {
									$rootScope.fields.upload = true;
									if ($scope.path && $scope.path !== "") {
										$rootScope.fields.folderName = $scope.path.substring(0, $scope.path.length - 1);
									} else {
										$rootScope.fields.folderName = "/";
									}
								} else {
									//if the upload pane is already open and we drag-dropped onto no path, keep what was there... but if we dropped on a custom folder, take that instead
									if ($scope.path && $scope.path !== "") {
										$rootScope.fields.folderName = $scope.path.substring(0, $scope.path.length - 1);
									}
								}
							}
						});	
					}
				}
			});
		}
	};
}).
directive('uploadForm', function($rootScope) {
	//directive that controls the upload form
	return {
		scope: false,
		restrict: 'A',
		template: '' + 
			'<table ng-style="{backgroundColor : (fields.loading && \'#FF9999\') || \'transparent\'}" style="width: 330px; padding: 15px; border: 1px solid #909090" cellpadding="10" cellspacing="0" border="0" align="center">' + 
				'<tr>' + 
					'<td valign="top">Folder:</td>' + 
					'<td>' + 
						'<span ng-bind="fields.folderName | humanreadable"></span>' + 
						'<input type="text" ng-show="false" id="folder" ng-model="fields.folderName" name="folder">' + 
					'</td>' + 
				'</tr>' + 
				'<tr>' + 
					'<td valign="top">File(s):</td>' + 
					'<td>' + 
					//ng-show="!(fields.droppedFiles.length > 0) || this.value !== \'\'"
						'<input style="width: 100%" id="file" ng-disabled="fields.loading" type="file" name="{{activeClass}}"  ng-required="!(fields.droppedFiles.length > 0)" multiple="multiple">' + 
						'<p><span ng-if="fields.droppedFiles.length > 0" style="color: red"><b>+</b></span></p>' + 
						'<div style="width: 100%" ng-show="fields.droppedFiles.length"><span style="color: red"><b>{{fields.droppedFiles.length}} file(s) drag/dropped</b> <img style="float: right; max-height: 20px" ng-src="x.png" ng-click="fields.droppedFiles = []"></span></div>' + 
					'</td>' + 
				'</tr>' + 
				'<tr>' + 
					'<td valign="top" align="left" colspan="2">' + 
						'<label><input ng-model="futureReveal" ng-disabled="fields.loading" type="checkbox"></input> Future Reveal</label><br />' + 
						'<p>' + 
							'<div ng-show="futureReveal"><span style="padding-right: 10px">Date: </span><input style="width: 170px" ng-required="futureReveal" ng-model="revealTime" id="datetimepicker" type="text" name="reveal"></input><script type="text/javascript">$("#datetimepicker").AnyTime_picker({' + 
								'format: \'%m/%e/%Y %h:%i:%s %p\',' + 
								'earliest: new Date(),' + 
							'});</script></div>' + 
						'</p>' + 
					'</td>' + 
				'</tr>' + 
				'<tr>' + 
					'<td colspan="2" align="center" style="padding-top: 20px">' + 
						'<input style="width: 60%; height: 40px" type="submit" ng-disabled="fields.loading" value="Submit"></input>' + 
					'</td>' + 
				'</tr>' + 
			'</table>',
		link: function($scope, elem, attr) {
			//when the form is submitted, take over that event
			elem.bind('submit', function(e) {
				//$(elem).children('table').css('background-color', '#FF9999');
				e.preventDefault();
				$scope.$apply(function () {
					if ($scope.futureReveal) {
						$scope.revealTime = new Date($scope.revealTime).getTime();
					} else {
						$scope.revealTime = "";
					}
				});
				oData = new FormData(this);
				$scope.$apply(function () {
					$scope.futureReveal = false;
				});
				$rootScope.$apply(function () {
					$rootScope.fields.loading = true; //must be applied after the form data is grabbed since disabling the file input keeps it from actually uploading
				});
				for (var i = 0; i < $rootScope.fields.droppedFiles.length; i++) 
				{
					//loop through all of the dropped files and append them to the formdata
					oData.append($scope.activeClass, $rootScope.fields.droppedFiles[i]);
				}
				$rootScope.$apply(function () {
					//clear out the dropped files before uploading this batch so if the user drops more on, those can be queued up for the next round after this is finished
					$rootScope.fields.droppedFiles = [];
				});
				//we're sending the data to the server using XMLHttpRequest
				//uploading to the /upload endpoint
				var oReq = new XMLHttpRequest();
				oReq.open("post", "upload", true);
				oReq.onload = function(oEvent) {
					if (oReq.status == 200) {
						//$(elem).children('table').css('background-color', 'transparent');
						$rootScope.$apply(function () {
							$rootScope.fields.loading = false;
						});
						try {
							if ($rootScope.fields.droppedFiles.length == 0) {
								$rootScope.$apply(function () {
									$rootScope.fields.upload = false;
								});	
							}
							document.getElementById('file').value = '';
							$scope.revealTime = "";
						} catch (e) {}
					} else {
						alert("There was an error uploading your file");
					}
				};
				//send the data
				oReq.send(oData);
				
			});
		}
	};
}).
directive('folder', function(RecursionHelper) {
	//directive that renders folders which may recursively contain other files and folders
	return {
		scope: false,
		restrict: 'E',
		template: '' + 
			'<ul drag-and-drop class="example-animate-container" ng-style="{borderLeft : ((object.files || object.folders) && path && \'1px solid #909090\') || \'\'}">' + 
				'<li draggable="true" ondragstart="(function(event){ event.dataTransfer.setData(\'text\', angular.element($(event.target)).scope().path + angular.element($(event.target)).scope().file.hash); })(event);" class="animate-repeat" style="position: relative; border-bottom: 1px solid #909090; text-align: right" ng-repeat="file in object.files | filter: {name: searchterm} | orderBy: \'-date\' track by file.hash" ng-if="!student || currentDate >= file.reveal">' + 
					'<a draggable="false" style="float: left" ng-href="download?active={{activeClass}}&hash={{path + file.hash}}" ng-bind="file.name"></a><div style="display: inline-block; padding-left: 20px"><div style="display: inline-block; padding-right: 20px"><a draggable="false" href="#" ng-click="preview = !preview">{{preview ? "close" : "preview"}}</a></div><div ng-if="!student" style="display: inline-block; padding-right: 20px"><a draggable="false" ng-href="delete?active={{activeClass}}&hash={{path + file.hash}}" target="hidden-iframe">delete</a></div><div ng-if="currentDate >= file.reveal" style="display: inline-block; width: 65px">{{file.date | date:"M/dd/yy"}}</div><div ng-if="currentDate < file.reveal" style="display: inline-block; width: 65px; color: red">{{file.reveal | date:"M/dd/yy"}}</div><div ng-if="currentDate >= file.reveal" style="display: inline-block; width: 80px">{{file.date | date:"h:mma"}}</div><div ng-if="currentDate < file.reveal" style="display: inline-block; width: 80px; color: red">{{file.reveal | date:"h:mma"}}</div></div><br />' + 
					'<div ng-if="preview" style="padding-bottom: 10px"><viewer hash="{{path + file.hash}}" active="{{activeClass}}"></viewer></div>' + 
				'</li>' + 
				//ng-if="folder.files || folder.folders"> will hide empty folders by default
				'<li ng-class="divClass" class="animate-repeat noselect" style="padding-left: 20px" ng-repeat="(name, folder) in object.folders | folderfilter:searchterm"' + 
					'<div class="noselect">' + 
						'<p></p>' + 
						'<div drag-and-drop draggable="true" ondragstart="(function(event){ event.dataTransfer.setData(\'text\', angular.element($(event.target)).scope().path); })(event);" class="titlebar" ng-style="{minWidth : (280 + (14 * path.split(\'/\')[path.split(\'/\').length - 2].length)) + \'px\'}" style="background-color: #F1F1F1; border: solid 1px #909090; border-radius: 10px" ng-click="foldershow = !foldershow"><img draggable="false" src="folder.png" style="max-height: 40px; padding-top: 5px; padding-right: 5px; padding-left: 10px"> <span style="vertical-align: top; position: relative; top: 7px; left: 5px">{{name}}</span><span style="float: right"><button-group style="position: relative; bottom: 3px; right: 10px"></button-group><img draggable="false" ng-src="{{foldershow || searchterm ? \'expand.png\' : \'collapse.png\'}}" style="padding-top: 5px; max-height: 35px"></span></div></div>' + 
						'<folder ng-show="!foldershow || searchterm" data="folder" path="name"></folder>' + 
					'</div>' + 
				'</li>' + 
			'</ul>',
		compile: function(element) {
			//pull in the RecursionHelper service to handle rendering recursive content
			return RecursionHelper.compile(element, function(scope, iElement, iAttrs, controller, transcludeFn){
				scope.$watch(iAttrs.data, function (value){
					if (value) {
						//watches the attributes on this directive specified by the HTML, and whether those objects are changing and reapplies it here
						scope.object = value;
					}
				});
				scope.$watch(iAttrs.path, function (value){
					//recursively at each level down inherits the path from the previous scope and redefines it again at this scope with the new value appended
					if (value && scope.path !== undefined) {
						scope.path += value + "/";
					} else {
						scope.path = "";
					}
				});
			});
		}
	};
}).directive('buttonGroup', function($rootScope) {
	//directive to specify a common group of buttons for administrative purposes
	return {
		scope: false,
		restrict: 'E',
		template: '' + 
			'<span ng-if="!student"><a draggable="false" class="button" href="" ng-click="uploadFolder($event)">Upload</a> <a draggable="false" class="button" target="hidden-iframe" ng-href="newfolder?active={{activeClass}}&path={{path + newname}}" ng-click="newFolder($event)"><img draggable="false" style="max-height: 30px; position: relative; top: 9px" src="newfolder.png"></a> <a draggable="false" ng-if="path" class="button" target="hidden-iframe" ng-href="deletefolder?active={{activeClass}}&path={{deletepath}}" ng-click="deleteFolder($event)"><img draggable="false" style="max-height: 30px; position: relative; top: 9px" src="delete.png"></a></span>',
		controller: function ($scope, $rootScope) {
			//function to handle uploading to a folder; pops open the upload form in this context
			$scope.uploadFolder = function (e) {
				e.stopPropagation();
				$rootScope.fields.upload = true;
				if ($scope.path && $scope.path !== "") {
					$rootScope.fields.folderName = $scope.path.substring(0, $scope.path.length - 1);
				} else {
					$rootScope.fields.folderName = "/";
				}
			}
			//function to handle creating a new folder in the interface
			$scope.newFolder = function (e) {
				e.stopPropagation();
				$scope.newname = prompt("Please enter a name for your new folder: ");
				if ($scope.newname) {
					//strips non alphanumeric characters from new folder names
					$scope.newname = $scope.newname.replace(/([^a-z 0-9]+)/gi, '');
					$rootScope.fields.upload = true;
					$rootScope.fields.folderName = $scope.path + $scope.newname;
				} else {
					e.preventDefault();
				}
			}
			//function to handle deleting a folder
			$scope.deleteFolder = function (e) {
				e.stopPropagation();
				//confirms with the user before actually deleting
				if (!confirm("This will delete the folder and all of its contents, and cannot be undone.  Are you sure?")) {
					//if the user doesn't want to commit to deleting the folder, the link is prevented from loading
					e.preventDefault();
				} else {
					if ($scope.path && $scope.path !== "") {
						//constructs a deletepath for the dynamic destination of the ahref url to load into the hidden iframe to actually perform the deletion
						$scope.deletepath = $scope.path.substring(0, $scope.path.length - 1);
					} else {
						$scope.deletepath = "/";
					}
				}
			}
		}
	};
});