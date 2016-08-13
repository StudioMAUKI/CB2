'use strict';

angular.module('CB2.controllers')
.controller('settingMainCtrl', ['$scope', '$ionicPlatform', 'PKAuthStorageService', function($scope, $ionicPlatform, PKAuthStorageService) {
  var settingMain = this;

  //////////////////////////////////////////////////////////////////////////////
  //  Private Methods
  //////////////////////////////////////////////////////////////////////////////


  //////////////////////////////////////////////////////////////////////////////
  //  Public Methods
  //////////////////////////////////////////////////////////////////////////////


  //////////////////////////////////////////////////////////////////////////////
  //  Event Handlers
  //////////////////////////////////////////////////////////////////////////////
  $scope.$on('$ionicView.loaded', function() {
    $ionicPlatform.ready(function() {
      PKAuthStorageService.init()
      .then(function() {
        settingMain.account = PKAuthStorageService.get('email');
      }, function(err) {
        showAlert('오류', '초기화 중 오류가 발생했습니다. 앱을 재시작 해주세요.');
      });
    });
	});
}]);