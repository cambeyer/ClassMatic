angular.module('ClassMaticApp', ['ClassMaticApp.controllers', 'ClassMaticApp.directives', 'ClassMaticApp.services', 'ngAnimate']);

angular.module('ClassMaticApp.controllers', []).controller('mainController', function($scope, $rootScope, $interval) {
	
	$rootScope.fields = {
		upload: false,
		droppedFiles: [],
		folderName: "/",
	}
	
	$scope.student = false;
	
	$scope.files = {};
	
	$scope.currentDate = Date.now();
	$interval(function() {
		$scope.currentDate = Date.now();
	}, 1000);
	
	$scope.classes = ['MCS1', 'MCS2', 'MCS3'];
	$scope.activeClass = $scope.classes[0];
	
	$scope.socket = io();
	$scope.socket.on('reconnect', function(num) {
		$scope.requestFiles();
	});
	$scope.requestFiles = function() {
		$scope.socket.emit('message', $scope.activeClass);
	}
	$scope.socket.on('message', function (msg){
		$scope.$apply(function () {
			for (var className in msg) {
				if ($scope.files[className] || $scope.activeClass == className) {
					$scope.files[className] = msg[className];
					if (!$scope.files[$scope.activeClass] || !$scope.files[$scope.activeClass].folders) {
						$rootScope.fields.custom = "yes";
					}
				}
			}
		});	
	});
});