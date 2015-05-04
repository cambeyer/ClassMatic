angular.module('ClassMaticApp', ['ClassMaticApp.controllers', 'ClassMaticApp.directives', 'ClassMaticApp.services', 'ngAnimate']);

//main Angular module
angular.module('ClassMaticApp.controllers', []).controller('mainController', function($scope, $rootScope, $interval) {
	
	//accessible from any scope as long as the $rootScope is injected
	$rootScope.fields = {
		upload: false,
		loading: false,
		droppedFiles: [],
		folderName: "/",
	}
	
	//object representing the login credential information and term selection
	$scope.login = {
		sid: "",
		pin: "",
		year: "",
		term: ""
	}
	
	//variable to keep track of whether the user is authenticated or not
	$scope.authed = false;
	//variable to keep track of whether the user was unsuccessfully authenticated or has no classes
	$scope.error = false;
	
	//variable to keep track of whether the future reveal field is enabled
	$scope.futureReveal = false;
	//variable to associate with the upload for future reveal
	$scope.revealTime;
	
	//variable to keep track of whether student mode is active (controls like moving and deleting and uploading are disabled)
	$scope.student = true;
	//variable to keep track of whether admin mode is active (if it is, then the toggle for student mode is active; otherwise, student mode is enforced with no toggle)
	$scope.admin = false;
	
	//the master data structure of files/folders for all classes that is kept updated via websockets
	$scope.files = {};
	
	//variable to keep track of the current date; for comparison to future reveal dates
	$scope.currentDate = Date.now();
	//keep the date updated to the second
	$interval(function() {
		$scope.currentDate = Date.now();
	}, 1000);
	
	//keeps track of the classes the user can enumerate, populated from BannerWeb
	$scope.classes;
	//builds a list of years for the user to choose from, based on the current year first
	//can probably limit to the current year
	$scope.years = [];
	//builds a list of terms the user can choose from, based on the current term first
	$scope.terms = [];
	
	//keeps track of which class the user is currently viewing/interacting with
	$scope.activeClass;
	//keeps track of the loading indicator between submitting login details and receiving the list of classes
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
	
	//initialize the Socket.IO environment
	$scope.socket = io();
	//whenever the socket disconnects and reconnects, request the files from the server
	$scope.socket.on('reconnect', function(num) {
		$scope.requestFiles();
	});
	//sends a socket message asking for the active class' files
	$scope.requestFiles = function() {
		$scope.socket.emit('message', $scope.activeClass);
	}
	//sends a socket message with the login details and enables the loading indicator
	$scope.sendLogin = function() {
		$scope.error = false;
		$scope.socket.emit('classes', $scope.login);
		$scope.loading = true;
	}
	//when a message is received from the socket with the relevant class' files... load them
	$scope.socket.on('message', function (msg){
		$scope.$apply(function () {
			for (var className in msg) {
				//only care about the classes we have asked about before or the current class (even if never asked for before), since all classes that get updated are sent out to all sockets
				if ($scope.files[className] || $scope.activeClass == className) {
					//overwrite the current data structure with the new information
					$scope.files[className] = msg[className];
				}
			}
		});	
	});
	//when a message is received from the socket with the list of classes... load them
	$scope.socket.on('classes', function (msg){
		$scope.$apply(function () {
			//hide the loading indicator since this is what we were waiting for
			$scope.loading = false;
			//if there is nothing in the response, blank the password field and show the error
			if (!msg || !msg.classes || !msg.classes.length > 0) {
				$scope.login.pin = "";
				$scope.authed = false;
				$scope.error = true;
			} else {
				//if there are classes in the response, add them to the controller
				$scope.classes = msg.classes;
				//select the first class in the interface dropdown by default
				$scope.activeClass = $scope.classes[0];
				//fetch the files for the selected class from the server
				$scope.requestFiles();
				//set the appropriate combinations based on whether admin status is indicated by the socket
				if (msg.admin) {
					$scope.admin = true;
					$scope.student = false;
				} else {
					$scope.admin = false;
					$scope.student = true;
				}
				//since we received something back, there was no error
				$scope.error = false;
				//we are now logged in, so update that flag
				$scope.authed = true;
			}
		});	
	});
});