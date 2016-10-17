'use strict';

angular.module('CB2.controllers')
.controller('saveSecondCtrl', ['$scope', '$ionicHistory', '$cordovaClipboard', '$q', '$ionicPopup', 'CacheService', 'PostHelper', 'RemoteAPIService', function($scope, $ionicHistory, $cordovaClipboard, $q, $ionicPopup, CacheService, PostHelper, RemoteAPIService) {
  var saveSecond = this;
  saveSecond.clipboardMsg = '단축 URL 얻기 전';

  //////////////////////////////////////////////////////////////////////////////
  //  Private Methods
  //////////////////////////////////////////////////////////////////////////////
  function copyURLToClipboard(url) {
    var deferred = $q.defer();

    if (ionic.Platform.isIOS() || ionic.Platform.isAndroid()) {
      $cordovaClipboard.copy(url)
      .then(function(result) {
        console.log('Copying URL was successed.', url);
        saveSecond.clipboardMsg = '클립보드에 링크가 복사 되었습니다!';
        deferred.resolve();
      }, function(err) {
        console.error('Copying URL was failed.', error);
        saveSecond.clipboardMsg = '오류가 발생하여 클립보드 복사에 실패했습니다.';
        deferred.reject(err);
      });
    } else {
      deferred.resolve();
    }

    return deferred.promise;
  }

  function getShortenURLAndCopyToClipboard() {
    if (saveSecond.post.shorten_url === null || saveSecond.post.shorten_url === '') {
      // shoten url을 얻어서 복사
      RemoteAPIService.getShortenURL(saveSecond.post.uplace_uuid)
      .then(function(url) {
        saveSecond.shorten_url = url;
        saveSecond.post.shorten_url = url;
        copyURLToClipboard(saveSecond.shorten_url);
      }, function(err) {
        seveSecond.clipboardMsg = '단축 URL을 얻어오지 못했습니다.';
        saveSecond.shorten_url = '';
      })
    } else {
      saveSecond.shorten_url = saveSecond.post.shorten_url;
      copyURLToClipboard(saveSecond.shorten_url);
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  //  Public Methods
  //////////////////////////////////////////////////////////////////////////////
  saveSecond.goHome = function() {
    $ionicHistory.goBack(-2);
  }

  saveSecond.copyAgain = function() {
    if (saveSecond.shorten_url === '') {
      $ionicPopup.alert({
        title: '오류',
        template: '단축 URL을 얻어오지 못했습니다.'
      });
    } else {
      copyURLToClipboard(saveSecond.shorten_url)
      .then(function() {
        $ionicPopup.alert({
          title: '성공',
          template: '클립보드에 링크가 복사되었습니다.'
        });
      }, function(err) {
        $ionicPopup.alert({
          title: '오류',
          template: '오류가 발생하여 클립보드 복사에 실패했습니다.'
        });
      })
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  //  Event Handlers
  //////////////////////////////////////////////////////////////////////////////
  $scope.$on('$ionicView.afterEnter', function() {
		saveSecond.post = CacheService.get('lastSavedPost');
    PostHelper.decoratePost(saveSecond.post);
    console.debug('The last saved place', saveSecond.post);

    getShortenURLAndCopyToClipboard();
	});
}]);
