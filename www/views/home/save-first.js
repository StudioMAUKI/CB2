'use strict';

angular.module('CB2.controllers')
.controller('saveFirstCtrl', ['$scope', '$q', '$ionicPopup', '$ionicHistory', '$state', '$ionicModal', '$ionicActionSheet', '$ionicLoading', 'PhotoService', 'DOMHelper', 'StorageService', 'CacheService', 'RemoteAPIService', function($scope, $q, $ionicPopup, $ionicHistory, $state, $ionicModal, $ionicActionSheet, $ionicLoading, PhotoService, DOMHelper, StorageService, CacheService, RemoteAPIService) {
  var saveFirst = this;
  saveFirst.attatchedImages = [];
  saveFirst.note = '';
  saveFirst.placeNameForSave = '';
  saveFirst.locationBtnPlaceHolder = '어디인가요? 장소 이름을 직접 입력할 수 있습니다';
  saveFirst.gPlace = null;

  saveFirst.calculatedHeight = DOMHelper.getImageHeight('view-container', 3, 5);
  console.info('saveFirst.calculatedHeight = ' + saveFirst.calculatedHeight);

  //////////////////////////////////////////////////////////////////////////////
  //  Private Methods
  //////////////////////////////////////////////////////////////////////////////
  function init() {
    saveFirst.attatchedImages = [];
    saveFirst.note = '';
    saveFirst.placeNameForSave = '';
    saveFirst.locationBtnPlaceHolder = '어디인가요? 장소 이름을 직접 입력할 수 있습니다';
    saveFirst.gPlace = null;
  }

  function showAlert(title, msg) {
		return $ionicPopup.alert({ title: title, template: msg });
	}

  function getPhotoFromCamera() {
		PhotoService.getPhotoFromCamera()
		.then(function(imageURI) {
			saveFirst.attatchedImages.push(imageURI);
		}, function(err) {
      console.warn(err);
		});
  }

  function getPhotosFromAlbum() {
    PhotoService.getPhotosFromAlbum(10)
    .then(function(imageURIs) {
      saveFirst.attatchedImages = saveFirst.attatchedImages.concat(imageURIs);
    }, function(err) {
      console.warn(err);
    });
  }

  function fitMapToScreen() {
    console.log('call fitMapToScreen');
		var documentHeight = $(document).height();
		var barHeight = document.getElementsByTagName('ion-header-bar')[0].clientHeight || 44;
    $('#map').css({
			height: documentHeight
        - barHeight
		});
    //  이거 꼭 해줘야 지도가 제대로 그려짐. (안그러면 걍 회색으로 나옴)
    // google.maps.event.trigger(map.mapObj, 'resize');
	}

  function initAutocomplete() {
    var map = new google.maps.Map(document.getElementById('map'), {
      center: {lat: -33.8688, lng: 151.2195},
      zoom: 15,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      zoomControl: false,
  		mapTypeControl: false,
  		streetViewControl: false
    });

    // Create the search box and link it to the UI element.
    var input = document.getElementById('pac-input');
    $('#pac-input').css({
      width: $(document).width() - 24
    });
    var searchBox = new google.maps.places.SearchBox(input);
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

    // Bias the SearchBox results towards current map's viewport.
    map.addListener('bounds_changed', function() {
      console.info('bounds_changed');
      searchBox.setBounds(map.getBounds());
    });

    var markers = [];
    // [START region_getplaces]
    // Listen for the event fired when the user selects a prediction and retrieve
    // more details for that place.
    searchBox.addListener('places_changed', function() {
      console.info('places_changed');
      var places = searchBox.getPlaces();

      if (places.length == 0 || places.length > 1) {
        return;
      }
      console.info('place: ', places);
      saveFirst.gPlace = places[0];

      // Clear out the old markers.
      markers.forEach(function(marker) {
        marker.setMap(null);
      });
      markers = [];

      // For each place, get the icon, name and location.
      var bounds = new google.maps.LatLngBounds();
      places.forEach(function(place) {
        var icon = {
          url: place.icon,
          size: new google.maps.Size(71, 71),
          origin: new google.maps.Point(0, 0),
          anchor: new google.maps.Point(17, 34),
          scaledSize: new google.maps.Size(25, 25)
        };

        // Create a marker for each place.
        markers.push(new google.maps.Marker({
          map: map,
          icon: icon,
          title: place.name,
          position: place.geometry.location
        }));

        if (place.geometry.location) {
          console.debug('lat', place.geometry.location.lat());
          console.debug('lng', place.geometry.location.lng());
          setTimeout(function(){
            map.setZoom(15);
            setTimeout(function() {
              map.setCenter({
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng()
              });
            }, 100);
          }, 100);
        }

        // if (place.geometry.viewport) {
        //   // Only geocodes have viewport.
        //   bounds.union(place.geometry.viewport);
        // } else {
        //   bounds.extend(place.geometry.location);
        // }
      });
      map.fitBounds(bounds);
    });
    // [END region_getplaces]
  }

  function postPlace() {
    var deferred = $q.defer();

		//	브라우저의 경우 테스트를 위해 분기함
		if (!ionic.Platform.isIOS() && !ionic.Platform.isAndroid()) {
      saveFirst.attatchedImages = [];
			saveFirst.attatchedImages.push(saveFirst.browserFile);
		}

		$ionicLoading.show({
			template: '<ion-spinner icon="lines">저장 중..</ion-spinner>',
			duration: 30000
		});

    var tasksOfUploadingImages = [];
    for (var i = 0; i < saveFirst.attatchedImages.length; i++) {
      tasksOfUploadingImages.push(RemoteAPIService.uploadImage(saveFirst.attatchedImages[i]));
    }
    $q.all(tasksOfUploadingImages)
    .then(function(results) {
      var curPos = StorageService.get('curPos');
      var uploadedImages = [];
      for (var i = 0; i < results.length; i++) {
        uploadedImages.push({content: results[i].url});
      }

      RemoteAPIService.sendUserPost({
				lonLat: {
					lon: curPos.longitude,
					lat: curPos.latitude
				},
				notes: [{
					content: saveFirst.note
				}],
				images: uploadedImages,
				addr1: { content: StorageService.get('addr1') || null },
				addr2: { content: StorageService.get('addr2') || null },
				addr3: { content: StorageService.get('addr3') || null },
        name: { content: 'test' || null}
			})
			.then(function(result) {
        console.debug(result);
				$ionicLoading.hide();
        CacheService.set('lastSavedPlace', result.data);
        deferred.resolve();
			}, function(err) {
        console.error('장소 저장 실패', err);
				$ionicLoading.hide();
				showAlert('장소 저장 실패', err);
        deferred.reject();
			});
    }, function(err) {
      console.error('이미지 업로드 실패', err);
      $ionicLoading.hide();
			saveFirst.showAlert('이미지 업로드 실패', err);
      deferred.reject();
    });

    return deferred.promise;
	}

  //////////////////////////////////////////////////////////////////////////////
  //  Public Methods
  //////////////////////////////////////////////////////////////////////////////
  saveFirst.showFileForm = function() {
		return (!ionic.Platform.isIOS() && !ionic.Platform.isAndroid());
	};

  saveFirst.addAttatchedImage = function() {
    $ionicActionSheet.show({
      buttons: [
        { text: '카메라로 사진 찍기' },
        { text: '사진 앨범에서 선택' }
      ],
      titleText: '사진을 추가 합니다.',
      cancelText: 'Cancel',
      buttonClicked: function(index) {
        console.log('[Event(ActionSheet:click)]Button['+ index + '] is clicked.');
        if (index == 0) {
          getPhotoFromCamera();
        } else {
          getPhotosFromAlbum();
        }
        return true;
      }
    });
  };

  saveFirst.deleteAttatchedImage = function(index) {
    $ionicPopup.confirm({
			title: '사진 삭제',
			template: '선택한 사진을 지우시겠습니까?'
		})
		.then(function(res){
			if (res) {
        console.log('Delete image : ' + index);
        saveFirst.attatchedImages.splice(index, 1);
      }
    });
  };

  saveFirst.goBack = function() {
    $ionicHistory.goBack();
  };

  saveFirst.goNext = function() {
    postPlace()
    .then(function() {
      $state.go('tab.saveSecond');
    });

  };

  saveFirst.showLocationDlg = function() {
    $ionicModal.fromTemplateUrl('views/home/modal-location.html', {
			scope: $scope,
			animation: 'slide-in-up'
		})
		.then(function(modal) {
			saveFirst.locationDlg = modal;
			saveFirst.locationDlg.show();
      initAutocomplete();
      fitMapToScreen();
		});
  };

  saveFirst.closeLocationDlg = function() {
    saveFirst.locationDlg.hide();
    saveFirst.locationDlg.remove();
  };

  saveFirst.disableTap = function(){
    var container = document.getElementsByClassName('pac-container')[0];
    // disable ionic data tab
    angular.element(container).attr('data-tap-disabled', 'true');
    // leave input field if google-address-entry is selected
    angular.element(container).on('click', function(){
        document.getElementById('pac-input').blur();
    });
  };

  //////////////////////////////////////////////////////////////////////////////
  //  Event Handlers
  //////////////////////////////////////////////////////////////////////////////
  $scope.$on('$ionicView.loaded', function() {
    init();
	});

  $scope.$on('$ionicView.afterEnter', function() {
    var backView = $ionicHistory.viewHistory().backView;
    var curView = $ionicHistory.viewHistory().currentView;
    if (backView !== null && backView.stateName === 'tab.home') {
      init();
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
