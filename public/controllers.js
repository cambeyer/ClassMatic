angular.module('ClassMaticApp', ['ClassMaticApp.controllers', 'ClassMaticApp.directives', 'ClassMaticApp.services', 'ngAnimate']);

angular.module('ClassMaticApp.controllers', []).controller('mainController', function($scope, $rootScope, $interval) {
	
	$rootScope.fields = {
		upload: false,
		loading: false,
		droppedFiles: [],
		folderName: "/",
	}
	
	$scope.login = {
		sid: "",
		pin: "",
		year: "",
		term: ""
	}
	
	$scope.authed = false;
	$scope.error = false;
	
	$scope.futureReveal = false;
	$scope.revealTime;
	
	$scope.student = true;
	$scope.admin = false;
	
	$scope.files = {};
	
	$scope.currentDate = Date.now();
	$interval(function() {
		$scope.currentDate = Date.now();
	}, 1000);
	
	$scope.classes;
	$scope.years = [];
	$scope.terms = [];
	$scope.activeClass;
	$scope.loading = false;
	
	$scope.buildYears = function() {
		$scope.years = [];
		var currentYear = new Date().getFullYear();
		for (var i = currentYear; i > currentYear - 4; i--) {
			$scope.years.push(i);
		}
		$scope.login.year = $scope.years[0];
	}
	
	$scope.buildTerms = function() {
		$scope.terms = [];
		var currentMonth = new Date().getMonth() + 1;
		if (currentMonth <= 5) {
			$scope.terms.push("Spring");
			$scope.terms.push("Fall");
			$scope.terms.push("Summer");
		} else if (currentMonth <= 8) {
			$scope.terms.push("Summer");
			$scope.terms.push("Spring");
			$scope.terms.push("Fall");
		} else {
			$scope.terms.push("Fall");
			$scope.terms.push("Summer");
			$scope.terms.push("Spring");
		}
		$scope.login.term = $scope.terms[0];
	}
	
	$scope.socket = io();
	$scope.socket.on('reconnect', function(num) {
		$scope.requestFiles();
	});
	$scope.requestFiles = function() {
		$scope.socket.emit('message', $scope.activeClass);
	}
	$scope.sendLogin = function() {
		$scope.socket.emit('classes', $scope.login);
		$scope.loading = true;
	}
	$scope.socket.on('message', function (msg){
		$scope.$apply(function () {
			for (var className in msg) {
				if ($scope.files[className] || $scope.activeClass == className) {
					$scope.files[className] = msg[className];
				}
			}
		});	
	});
	$scope.socket.on('classes', function (msg){
		$scope.$apply(function () {
			$scope.loading = false;
			if (!msg || !msg.classes || !msg.classes.length > 0) {
				$scope.login.pin = "";
				$scope.authed = false;
				$scope.error = true;
			} else {
				$scope.classes = msg.classes;
				$scope.activeClass = $scope.classes[0];
				$scope.requestFiles();
				if (msg.admin) {
					$scope.admin = true;
					$scope.student = false;
				} else {
					$scope.admin = false;
					$scope.student = true;
				}
				$scope.error = false;
				$scope.authed = true;
			}
		});	
	});
});