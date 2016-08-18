'use strict';

angular.module('CB2.controllers')
.controller('saveSecondCtrl', ['$scope', '$ionicHistory', '$cordovaClipboard', 'CacheService', 'PostHelper', 'RemoteAPIService', function($scope, $ionicHistory, $cordovaClipboard, CacheService, PostHelper, RemoteAPIService) {
  var saveSecond = this;

  //////////////////////////////////////////////////////////////////////////////
  //  Private Methods
  //////////////////////////////////////////////////////////////////////////////
  function copyURLToClipboard(url) {
    if (ionic.Platform.isIOS() || ionic.Platform.isAndroid()) {
      $cordovaClipboard.copy(url)
      .then(function(result) {
        console.log('Copying URL was successed.', url);
        saveSecond.clipboardMsg = '클립보드에 링크가 복사 되었습니다. 자유롭게 공유하세요.';
      }, function(err) {
        console.error('Copying URL was failed.', error);
        seveSecond.clipboardMsg = '오류가 발생하여 클립보드 복사에 실패했습니다.';
      });
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  //  Public Methods
  //////////////////////////////////////////////////////////////////////////////
  saveSecond.goHome = function() {
    $ionicHistory.goBack(-2);
  }

  //////////////////////////////////////////////////////////////////////////////
  //  Event Handlers
  //////////////////////////////////////////////////////////////////////////////
  $scope.$on('$ionicView.afterEnter', function() {
		saveSecond.post = CacheService.get('lastSavedPost');
    PostHelper.decoratePost(saveSecond.post);
    console.debug('The last saved place', saveSecond.post);

    if (saveSecond.post.shorten_url === null) {
      // shoten url을 얻어서 복사
      RemoteAPIService.getShortenURL(saveSecond.post.uplace_uuid)
      .then(function(url) {
        copyURLToClipboard(url);
        saveSecond.shorten_url = url;
      }, function(err) {
        seveSecond.clipboardMsg = '단축 URL을 얻어오지 못했습니다.';
        saveSecond.shorten_url = '';
      })
    } else {
      saveSecond.shorten_url = saveSecond.post.shorten_url;
      copyURLToClipboard(saveSecond.post.shorten_url);
    }
	});
}]);
