'use strict';

angular.module('CB2.controllers')
.controller('saveSecondCtrl', ['$scope', '$ionicHistory', 'CacheService', function($scope, $ionicHistory, CacheService) {
  var saveSecond = this;  

  //  Public methods
  saveSecond.goHome = function() {
    $ionicHistory.goBack(-2);
  }

  //  Event Handlers
  $scope.$on('$ionicView.afterEnter', function() {
		console.info('The View History', $ionicHistory.viewHistory());
    saveSecond.place = CacheService.get('lastSavedPlace');
    console.info('The last saved place', saveSecond.place);
	});
}]);
