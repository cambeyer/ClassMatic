angular.module('ClassMaticApp.services', [])
.factory('RecursionHelper', ['$compile', function($compile){
	return {
		compile: function(element, link){
			if(angular.isFunction(link)){
				link = { post: link };
			}
			var contents = element.contents().remove();
			var compiledContents;
			return {
				pre: (link && link.pre) ? link.pre : null,
				post: function(scope, element){
					if(!compiledContents){
						compiledContents = $compile(contents);
					}
					compiledContents(scope, function(clone){
						element.append(clone);
					});
					if(link && link.post){
						link.post.apply(null, arguments);
					}
				}
			};
		}
	};
}]).
filter('humanreadable', function () {
	return function (item) {
		if (item.substring(0, 1) == '/') {
			item = item.substring(1);
		}
		if (item.length == 0) {
			return "No Folder";
		}
		return item.substring(0).replace(/\//g, " --> ");
	};
});