angular.module('ClassMaticApp.directives', []).
directive('viewer', function ($location) {
	return {
		restrict: 'E',
		scope: false,
		replace: true,
		link: function (scope, element, attrs) {
			var link = $location.protocol() + "://" + $location.host() + ':' + $location.port() + '/download?active=' + attrs.active + '&hash=' + attrs.hash;
			element.html('<div style="background-color: #F8F8F8; border: 1px solid #D8D8D8; padding: 20px; text-align: center"><div style="padding: 0px; line-height: 0px; display: none">' +
			'<video controls preload = "auto" style="max-height: 500px; max-width: 500px" src="' + link + '" onerror="if ($(this).siblings().length == 1) { $(this).parent().css(\'display\', \'\'); } $(this).remove();" oncanplay="if (this.duration > 0) { $(this).siblings().remove(); $(this).parent().css(\'display\', \'\'); } else { if ($(this).siblings().length == 1) { $(this).parent().css(\'display\', \'\'); } $(this).remove(); }"></video>' + 
			'<img style="max-height: 400px; max-width: 400px" src="' + link + '" onerror="if ($(this).siblings().length == 1) { $(this).parent().css(\'display\', \'\'); } $(this).remove();" onload="$(this).siblings().remove(); $(this).parent().css(\'display\', \'\')">' + 
			'<iframe src="https://docs.google.com/gview?url=' + encodeURIComponent(link) + '&embedded=true" style="width:600px; height:500px;" frameborder="0" onload="if ($(this).siblings().length == 0) { $(this).parent().css(\'display\', \'\'); }"></iframe>' +
			'</div></div>');
		}
	};
}).
directive('dragAndDrop', function($rootScope) {
	return {
		scope: false,
		restrict: 'A',
		link: function($scope, elem, attr) {
			elem.bind('dragenter', function(e) {
				e.stopPropagation();
				e.preventDefault();
				if ($scope.path && !$scope.student) {
					elem.filter('.titlebar').css('background-color', '#66C166');
				}
			});
			elem.bind('dragleave', function(e) {
				e.stopPropagation();
				e.preventDefault();
				if ($scope.path && !$scope.student) {
					elem.filter('.titlebar').css('background-color', '#F1F1F1');
				}
			});
			elem.bind('dragover', function(e) {
				e.stopPropagation();
				e.preventDefault();
				if ($scope.path && !$scope.student) {
					elem.filter('.titlebar').css('background-color', '#66C166');
				}
			});
			
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
					link.target = "hidden-iframe";
					link.click();
				}
			}
			
			elem.bind('drop', function(e) {
				e.stopPropagation();
				e.preventDefault();
				if ($scope.path) {
					elem.filter('.titlebar').css('background-color', '#F1F1F1');
				}
				if (!$scope.student) {
					var go = true;
					if (e.originalEvent.dataTransfer.getData("mypath") && e.originalEvent.dataTransfer.getData("mypath") !== undefined) {
						moveFile(elem, e.originalEvent.dataTransfer.getData("mypath"));
						return;
					}
					if ($rootScope.fields.droppedFiles.length > 0) {
						go = confirm("This will overwrite your previously dropped files.");
					} 
					if (go) {
						$rootScope.$apply(function () {
							$rootScope.fields.droppedFiles = [];
							var dropped = e.originalEvent.dataTransfer.files; //no originalEvent if jQuery script is included after angular
							var warned = false;
							for (var i in dropped) {
								if (dropped[i].type || (dropped[i].size && dropped[i].size % 4096 !== 0)) {
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
	return {
		scope: false,
		restrict: 'A',
		template: '' + 
			'<table ng-style="{backgroundColor : (loading && \'#FF9999\') || \'transparent\'}" style="width: 330px; padding: 15px; border: 1px solid #909090" cellpadding="10" cellspacing="0" border="0" align="center">' + 
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
						'<input style="width: 100%" id="file" ng-disabled="loading" type="file" name="{{activeClass}}"  ng-required="!(fields.droppedFiles.length > 0)" multiple="multiple">' + 
						'<p><span ng-if="fields.droppedFiles.length > 0" style="color: red"><b>+</b></span></p>' + 
						'<div style="width: 100%" ng-show="fields.droppedFiles.length"><span style="color: red"><b>{{fields.droppedFiles.length}} file(s) drag/dropped</b> <img style="float: right; max-height: 20px" ng-src="x.png" ng-click="fields.droppedFiles = []"></span></div>' + 
					'</td>' + 
				'</tr>' + 
				'<tr>' + 
					'<td colspan="2" align="center" style="padding-top: 20px">' + 
						'<input type="hidden" name="reveal" value="{{currentDate - 1000}}"></input>' + 
						'<input style="width: 60%; height: 40px" type="submit" ng-disabled="loading" value="Submit"></input>' + 
					'</td>' + 
				'</tr>' + 
			'</table>',
		link: function($scope, elem, attr) {
			elem.bind('submit', function(e) {
				//$(elem).children('table').css('background-color', '#FF9999');
				$scope.loading = true;
				e.preventDefault();
				oData = new FormData(this);
				for (var i = 0; i < $rootScope.fields.droppedFiles.length; i++) 
				{
					oData.append($scope.activeClass, $rootScope.fields.droppedFiles[i]);
				}
				$rootScope.$apply(function () {
					$rootScope.fields.droppedFiles = [];
				});
				var oReq = new XMLHttpRequest();
				oReq.open("post", "upload", true);
				oReq.onload = function(oEvent) {
					if (oReq.status == 200) {
						//$(elem).children('table').css('background-color', 'transparent');
						$scope.loading = false;
						try {
							if ($rootScope.fields.droppedFiles.length == 0) {
								$rootScope.$apply(function () {
									$rootScope.fields.upload = false;
								});	
							}
							document.getElementById('file').value = '';
						} catch (e) {}
					} else {
						alert("There was an error uploading your file");
					}
				};
				oReq.send(oData);
			});
		}
	};
}).
directive('folder', function(RecursionHelper) {
	return {
		scope: false,
		restrict: 'E',
		template: '' + 
			'<ul drag-and-drop class="example-animate-container" ng-style="{borderLeft : ((object.files || object.folders) && path && \'1px solid #909090\') || \'\'}">' + 
				'<li draggable="true" ondragstart="(function(event){ event.dataTransfer.setData(\'mypath\', angular.element($(event.target)).scope().path + angular.element($(event.target)).scope().file.hash); })(event);" class="animate-repeat" style="position: relative; border-bottom: 1px solid #909090; text-align: right" ng-repeat="file in object.files | filter: {name: searchterm} | orderBy: \'-date\' track by file.hash" ng-if="currentDate >= file.reveal">' + 
					'<a draggable="false" style="float: left" ng-href="download?active={{activeClass}}&hash={{path + file.hash}}" ng-bind="file.name"></a><div style="display: inline-block; padding-left: 20px"><div style="display: inline-block; padding-right: 20px"><a draggable="false" href="#" ng-click="preview = !preview">{{preview ? "close" : "preview"}}</a></div><div ng-if="!student" style="display: inline-block; padding-right: 20px"><a draggable="false" ng-href="delete?active={{activeClass}}&hash={{path + file.hash}}" target="hidden-iframe">delete</a></div><div style="display: inline-block; width: 65px">{{file.date | date:"M/dd/yy"}}</div><div style="display: inline-block; width: 80px">{{file.date | date:"h:mma"}}</div></div><br />' + 
					'<div ng-if="preview" style="padding-bottom: 10px"><viewer hash="{{path + file.hash}}" active="{{activeClass}}"></viewer></div>' + 
				'</li>' + 
				//ng-if="folder.files || folder.folders"> will hide empty folders by default
				'<li ng-class="divClass" class="animate-repeat noselect" style="padding-left: 20px" ng-repeat="(name, folder) in object.folders | folderfilter:searchterm"' + 
					'<div class="noselect">' + 
						'<p></p>' + 
						'<div drag-and-drop draggable="true" ondragstart="(function(event){ event.dataTransfer.setData(\'mypath\', angular.element($(event.target)).scope().path); })(event);" class="titlebar" ng-style="{minWidth : (280 + (14 * path.split(\'/\')[path.split(\'/\').length - 2].length)) + \'px\'}" style="background-color: #F1F1F1; border: solid 1px #909090" ng-click="foldershow = !foldershow"><img draggable="false" src="folder.png" style="max-height: 40px; padding-top: 5px; padding-right: 5px; padding-left: 10px"> <span style="vertical-align: top; position: relative; top: 7px; left: 5px">{{name}}</span><span style="float: right"><button-group style="position: relative; bottom: 3px; right: 10px"></button-group><img draggable="false" ng-src="{{foldershow || searchterm ? \'expand.png\' : \'collapse.png\'}}" style="padding-top: 5px; max-height: 35px"></span></div></div>' + 
						'<folder ng-show="!foldershow || searchterm" data="folder" path="name"></folder>' + 
					'</div>' + 
				'</li>' + 
			'</ul>',
		compile: function(element) {
			return RecursionHelper.compile(element, function(scope, iElement, iAttrs, controller, transcludeFn){
				scope.$watch(iAttrs.data, function (value){
					if (value) {
						scope.object = value;
					}
				});
				scope.$watch(iAttrs.path, function (value){
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
	return {
		scope: false,
		restrict: 'E',
		template: '' + 
			'<span ng-if="!student"><a draggable="false" class="button" href="" ng-click="uploadFolder($event)">Upload</a> <a draggable="false" class="button" target="hidden-iframe" ng-href="newfolder?active={{activeClass}}&path={{path + newname}}" ng-click="newFolder($event)"><img draggable="false" style="max-height: 30px; position: relative; top: 9px" src="newfolder.png"></a> <a draggable="false" ng-if="path" class="button" target="hidden-iframe" ng-href="deletefolder?active={{activeClass}}&path={{deletepath}}" ng-click="deleteFolder($event)"><img draggable="false" style="max-height: 30px; position: relative; top: 9px" src="delete.png"></a></span>',
		controller: function ($scope, $rootScope) {
			$scope.uploadFolder = function (e) {
				e.stopPropagation();
				$rootScope.fields.upload = true;
				if ($scope.path && $scope.path !== "") {
					$rootScope.fields.folderName = $scope.path.substring(0, $scope.path.length - 1);
				} else {
					$rootScope.fields.folderName = "/";
				}
			}
			$scope.newFolder = function (e) {
				e.stopPropagation();
				$scope.newname = prompt("Please enter a name for your new folder: ");
				if ($scope.newname) {
					$scope.newname = $scope.newname.replace(/([^a-z 0-9]+)/gi, '');
					$rootScope.fields.upload = true;
					$rootScope.fields.folderName = $scope.path + $scope.newname;
				} else {
					e.preventDefault();
				}
			}
			$scope.deleteFolder = function (e) {
				e.stopPropagation();
				if (!confirm("This will delete the folder and all of its contents, and cannot be undone.  Are you sure?")) {
					e.preventDefault();
				} else {
					if ($scope.path && $scope.path !== "") {
						$scope.deletepath = $scope.path.substring(0, $scope.path.length - 1);
					} else {
						$scope.deletepath = "/";
					}
				}
			}
		}
	};
});