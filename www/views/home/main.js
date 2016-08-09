'use strict';

angular.module('CB2.controllers')
.controller('mainCtrl', ['$scope', '$ionicModal', '$ionicPopup', 'PhotoService', 'DOMHelper', function($scope, $ionicModal, $ionicPopup, PhotoService, DOMHelper) {
  var main = this;
  main.attatchedImages = [];
  main.note = '';
  main.placeNameForSave = '';

  main.calculatedHeight = DOMHelper.getImageHeight('view-container', 3, 5);
  console.info('main.calculatedHeight = ' + main.calculatedHeight);

  main.showAlert = function(title, msg) {
		return $ionicPopup.alert({ title: title, template: msg });
	};

  main.showFileForm = function() {
		return (!ionic.Platform.isIOS() && !ionic.Platform.isAndroid());
	};

  main.getPhotoByCamera = function() {
    main.attatchedImages = [];
		PhotoService.getPhotoWithCamera()
		.then(function(imageURI) {
			main.attatchedImages.push(imageURI);
			main.showSaveDlg();
		}, function(err) {
      console.warn(err);
		});
  };

  main.getPhotoesFromAlbum = function() {
    main.attatchedImages = [];
    PhotoService.getPhotoWithPhotoLibrary(10)
    .then(function(imageURIs) {
      main.attatchedImages = main.attatchedImages.concat(imageURIs);
      main.showSaveDlg();
    }, function(err) {
      console.warn(err);
    });
  };

  main.showSaveDlg = function() {
    $ionicModal.fromTemplateUrl('views/home/save-window.html', {
      scope: $scope,
      animation: 'slide-in-up'
    })
    .then(function(modal) {
      main.tags = [];
      main.saveDlg = modal;
      main.saveDlg.show();
    });
  }

  main.closeSaveDlg = function() {
		main.saveDlg.hide();
		main.saveDlg.remove();

		main.images = [];
		main.note = '';
	};

  main.confirmSave = function() {
    console.info('browser file = ' + main.browserFile);
    main.closeSaveDlg();
  };
}]);
