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
				if ($scope.path) {
					elem.css('background-color', '#66C166');
				}
			});
			elem.bind('dragleave', function(e) {
				e.stopPropagation();
				e.preventDefault();
				if ($scope.path) {
					elem.css('background-color', '#F1F1F1');
				}
			});
			elem.bind('dragover', function(e) {
				e.stopPropagation();
				e.preventDefault();
				if ($scope.path) {
					elem.css('background-color', '#66C166');
				}
			});
			elem.bind('drop', function(e) {
				e.stopPropagation();
				e.preventDefault();
				if ($scope.path) {
					elem.css('background-color', '#F1F1F1');
				}
				var go = true;
				if ($rootScope.fields.droppedFiles.length > 0) {
					go = confirm("This will overwrite your previously dropped files.");
				} 
				if (go) {
					$rootScope.$apply(function () {
						$rootScope.fields.droppedFiles = e.originalEvent.dataTransfer.files; //no originalEvent if jQuery script is included after angular
						if ($rootScope.fields.droppedFiles.length > 0) {
							$rootScope.fields.upload = true;
							if ($scope.path && $scope.path !== "") {
								$rootScope.fields.folderName = $scope.path.substring(0, $scope.path.length - 1);
							} else {
								$rootScope.fields.folderName = "/";
							}
						}
					});	
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
			'<table style="padding: 20px; border: 1px solid #909090" cellpadding="10" cellspacing="0" border="0" align="center">' + 
				'<tr>' + 
					'<td>Folder:</td>' + 
					'<td>' + 
						'<span ng-bind="fields.folderName | humanreadable"></span>' + 
						'<input type="text" ng-show="false" id="folder" ng-model="fields.folderName" name="folder">' + 
					'</td>' + 
				'</tr>' + 
				'<tr>' + 
					'<td>File(s):</td>' + 
					'<td>' + 
						'<input style="width: 200px" id="file" ng-disabled="loading" type="file" name="{{activeClass}}" ng-show="!(fields.droppedFiles.length > 0)" ng-required="!(fields.droppedFiles.length > 0)" multiple="multiple">' + 
						'<div style="width: 200px" ng-show="fields.droppedFiles.length"><span style="color: red"><b>{{fields.droppedFiles.length}} selected</b> <img style="float: right; max-height: 20px" ng-src="x.png" ng-click="fields.droppedFiles = []"></span></div>' + 
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
				$(elem).children('table').css('background-color', '#FF9999');
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
						$(elem).children('table').css('background-color', 'transparent');
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
			'<ul class="example-animate-container">' + 
				'<li class="animate-repeat" ng-repeat="file in object.files | orderBy: \'-date\' track by file.hash" ng-if="currentDate >= file.reveal">' + 
					'<a ng-href="download?active={{activeClass}}&hash={{path + file.hash}}" ng-bind="file.name"></a> (<a href="#" ng-click="preview = !preview">{{preview ? "close" : "preview"}}</a>, <a ng-href="delete?active={{activeClass}}&hash={{path + file.hash}}" target="hidden-iframe">delete</a>) - uploaded {{file.date | date:"M/dd/yy \'at\' h:mma"}}<br />' + 
					'<viewer ng-if="preview" hash="{{path + file.hash}}" active="{{activeClass}}"></viewer>' + 
				'</li>' + 
				'<li ng-class="divClass" class="animate-repeat" style="padding-left: 30px" ng-repeat="(name, folder) in object.folders" ng-if="folder.files || folder.folders">' + 
					'<div class="noselect">' + 
						'<p></p>' + 
						'<div drag-and-drop style="background-color: #F1F1F1; padding: 5px; border: solid 1px #909090" ng-click="foldershow = !foldershow"><img src="folder.png" style="max-height: 35px; padding-top: 5px; padding-right: 5px; padding-left: 10px"> <span style="vertical-align: top">{{name}}</span><span style="float: right"><button-group style="position: relative; bottom: 10px; right: 10px"></button-group><img ng-src="{{foldershow ? \'expand.png\' : \'collapse.png\'}}" style="padding-top: 5px; max-height: 35px"></span></div></div>' + 
						'<folder ng-show="!foldershow" data="folder" path="name"></folder>' + 
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
			'<a class="button" href="" ng-click="uploadFolder($event)">Upload</a> <a class="button" target="hidden-iframe" ng-href="newfolder?active={{activeClass}}&path={{path + newname}}" ng-click="newFolder($event)">New Folder</a> <a ng-if="path" class="button" target="hidden-iframe" ng-href="deletefolder?active={{activeClass}}&path={{deletepath}}" ng-click="deleteFolder($event)">Delete</a>',
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
				$rootScope.fields.upload = true;
				$rootScope.fields.folderName = $scope.path + $scope.newname;
				} else {
					e.preventDefault();
				}
			}
			$scope.deleteFolder = function (e) {
				e.stopPropagation();
				if (!confirm("Are you sure?")) {
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