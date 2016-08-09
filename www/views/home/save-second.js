'use strict';

angular.module('CB2.controllers')
.controller('saveSecondCtrl', ['$scope', '$ionicHistory', function($scope, $ionicHistory) {
  var saveSecond = this;

  //  Public methods
  saveSecond.goHome = function() {
    $ionicHistory.goBack(-2);
  }

  //  Event Handlers
  $scope.$on('$ionicView.afterEnter', function() {
		console.info('The title of back = ' + $ionicHistory.backTitle());
    console.info('The View History', $ionicHistory.viewHistory());
	});
}]);
