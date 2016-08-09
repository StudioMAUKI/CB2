'use strict';

angular.module('CB2.controllers')
.controller('mainCtrl', ['$scope', '$ionicHistory', function($scope, $ionicHistory) {
  var main = this;

  $scope.$on('$ionicView.afterEnter', function() {
		$ionicHistory.clearHistory();
    console.info('The View History', $ionicHistory.viewHistory());
	});
}]);
