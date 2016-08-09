'use strict';

angular.module('CB2.controllers')
.controller('saveFirstCtrl', ['$scope', '$ionicPopup', '$ionicHistory', '$state', 'PhotoService', 'DOMHelper', function($scope, $ionicPopup, $ionicHistory, $state, PhotoService, DOMHelper) {
  var saveFirst = this;
  saveFirst.attatchedImages = [];
  saveFirst.note = '';
  saveFirst.placeNameForSave = '';

  saveFirst.calculatedHeight = DOMHelper.getImageHeight('view-container', 3, 5);
  console.info('saveFirst.calculatedHeight = ' + saveFirst.calculatedHeight);

  //  private methods
  function showAlert(title, msg) {
		return $ionicPopup.alert({ title: title, template: msg });
	};

  function getPhotoFromCamera() {
    saveFirst.attatchedImages = [];
		PhotoService.getPhotoFromCamera()
		.then(function(imageURI) {
			saveFirst.attatchedImages.push(imageURI);
		}, function(err) {
      console.warn(err);
		});
  };

  function getPhotosFromAlbum() {
    saveFirst.attatchedImages = [];
    PhotoService.getPhotosFromAlbum(10)
    .then(function(imageURIs) {
      saveFirst.attatchedImages = saveFirst.attatchedImages.concat(imageURIs);
    }, function(err) {
      console.warn(err);
    });
  };

  //  public methods
  saveFirst.showFileForm = function() {
		return (!ionic.Platform.isIOS() && !ionic.Platform.isAndroid());
	};

  saveFirst.showSaveDlg = function() {
    $ionicModal.fromTemplateUrl('views/home/save-window.html', {
      scope: $scope,
      animation: 'slide-in-up'
    })
    .then(function(modal) {
      saveFirst.tags = [];
      saveFirst.saveDlg = modal;
      saveFirst.saveDlg.show();
    });
  };

  saveFirst.goBack = function() {
    $ionicHistory.goBack();
  };

  saveFirst.goNext = function() {
    $state.go('tab.saveSecond');
  }

  //  Event Handlers
  $scope.$on('$ionicView.afterEnter', function() {
    var backView = $ionicHistory.viewHistory().backView;
    var curView = $ionicHistory.viewHistory().currentView;
    if (backView !== null && backView.stateName === 'tab.home') {
      if (curView.stateParams && curView.stateParams.mode) {
        if (curView.stateParams.mode === 'camera') {
          getPhotoFromCamera();
        } else if (curView.stateParams.mode === 'album'){
          getPhotosFromAlbum();
        } else {
            console.error('지원되지 않는 방식으로 사진을 얻으려 함.');
        }
      } else {
        console.error('홈 뷰에서 넘어왔는데, 사진을 얻는 방법이 명시되어 있지 않음.');
      }
    } else {
      console.info('이전 뷰가 홈뷰가 아니었으므로, 카메라나 앨범을 새로 열지 않았음.');
    }
		// console.info('The View History', $ionicHistory.viewHistory());
	});
}]);
