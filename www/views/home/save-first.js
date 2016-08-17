'use strict';

angular.module('CB2.controllers')
.controller('saveFirstCtrl', ['$scope', '$q', '$ionicPopup', '$ionicHistory', '$state', '$ionicModal', '$ionicActionSheet', '$ionicLoading', 'PhotoService', 'DOMHelper', 'StorageService', 'CacheService', 'RemoteAPIService', 'MapService', function($scope, $q, $ionicPopup, $ionicHistory, $state, $ionicModal, $ionicActionSheet, $ionicLoading, PhotoService, DOMHelper, StorageService, CacheService, RemoteAPIService, MapService) {
  var saveFirst = this;
  saveFirst.attatchedImages = [];
  saveFirst.note = '';
  saveFirst.placeNameForSave = '';
  saveFirst.placeholderTitle = '어디인가요?';
  saveFirst.placeholderSubTitle = '장소 이름을 입력하세요';
  saveFirst.location = {};

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
    saveFirst.location = {};
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
			// height: documentHeight - barHeight
      height: 200
		});
    //  이거 꼭 해줘야 지도가 제대로 그려짐. (안그러면 걍 회색으로 나옴)
    // google.maps.event.trigger(map.mapObj, 'resize');
	}

  function initMap(pos) {
    pos = pos || {
      latitude: 37.5666103,
      longitude: 126.9783882
    };
    saveFirst.map = new google.maps.Map(document.getElementById('map'), {
      center: {lat: pos.latitude, lng: pos.longitude},
      zoom: 15,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      zoomControl: false,
  		mapTypeControl: false,
  		streetViewControl: false
    });
    saveFirst.curMarker = new google.maps.Marker({
      map: saveFirst.map,
      position: { lat: pos.latitude, lng: pos.longitude },
      draggable: true,
      zIndex: 9999
    });

    var markers = [];
    // [START region_getplaces]
    // Listen for the event fired when the user selects a prediction and retrieve
    // more details for that place.
    $scope.$watch('saveFirst.location', function(newValue) {
      console.info('places_changed', newValue);
      var place = newValue;
      if (!place.name) {
        console.debug('초기값 받은 것임');
        return;
      }

      if (place.type === 'mauki') {
        setTimeout(function(){
          saveFirst.map.setZoom(15);
          setTimeout(function() {
            saveFirst.map.setCenter({
              lat: pos.latitude,
              lng: pos.longitude
            });
          }, 100);
        }, 100);
      } else {
        // Clear out the old markers.
        markers.forEach(function(marker) {
          marker.setMap(null);
        });
        markers = [];

        // For each place, get the icon, name and location.
        var bounds = new google.maps.LatLngBounds();
        var icon = {
          url: place.icon,
          size: new google.maps.Size(71, 71),
          origin: new google.maps.Point(0, 0),
          anchor: new google.maps.Point(17, 34),
          scaledSize: new google.maps.Size(25, 25)
        };

        // Create a marker for each place.
        markers.push(new google.maps.Marker({
          map: saveFirst.map,
          icon: icon,
          title: place.name,
          position: place.geometry.location
        }));

        if (place.geometry.location) {
          setTimeout(function(){
            saveFirst.map.setZoom(15);
            setTimeout(function() {
              saveFirst.map.setCenter({
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng()
              });
            }, 100);
          }, 100);
        }
      }

      // saveFirst.map.fitBounds(bounds);
    });
    // [END region_getplaces]
  }

  function postPlace() {
    var deferred = $q.defer();
    var pos = {};
    var addrs = [null, null, null];

    if (saveFirst.location.type === 'mauki') {
      console.warn('채워 넣어야 함.');
      var curPos = StorageService.get('curPos');
      pos.lng = curPos.longitude;
      pos.lat = curPos.latitude;
      addrs[0] = StorageService.get('addr1');
      addrs[1] = StorageService.get('addr2');
      addrs[2] = StorageService.get('addr3');
    } else if (saveFirst.location.type === 'google'){
      pos.lng = saveFirst.location.geometry.location.lng();
      pos.lat = saveFirst.location.geometry.location.lat();

      addrs[0] = saveFirst.location.formatted_address;
    } else {
      console.warn('Not supported.');
      deferred.reject('Not supported.');
      return deferred.promise;
    }

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
      var uploadedImages = [];
      for (var i = 0; i < results.length; i++) {
        uploadedImages.push({content: results[i].url});
      }

      RemoteAPIService.sendUserPost({
        lonLat: {
					lon: pos.lng,
					lat: pos.lat
				},
				notes: [{
					content: saveFirst.note
				}],
				images: uploadedImages,
				addr1: { content: addrs[0] || null },
				addr2: { content: addrs[1] || null },
				addr3: { content: addrs[2] || null },
        // lps: [{ content: saveFirst.location.lps }],
        name: { content: saveFirst.location.name }
			})
			.then(function(result) {
        console.debug(result);
				$ionicLoading.hide();
        CacheService.set('lastSavedPost', result.data);
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
			showAlert('이미지 업로드 실패', err);
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
    if (saveFirst.location.name) {
      console.log(saveFirst.location);
      postPlace()
      .then(function() {
        $state.go('tab.saveSecond');
      });
    } else {
      showAlert('죄송합니다', '장소명을 기입해 주세요');
    }
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

    var div = document.getElementById('map').innerHTML = '현재 위치를 얻어오는 중입니다';
    MapService.getCurrentPosition()
    .then(function(pos) {
      MapService.getCurrentAddress(pos.latitude, pos.longitude)
      .then(function() {
        fitMapToScreen();
        initMap(pos);
      }, function(err) {
        console.error('현재 위치에 대한 주소 얻기 실패.');
      })
    }, function(err) {
      console.error(err);
      var div = document.getElementById('map').innerHTML = '현재 위치를 얻어오지 못했습니다';
    });
		// console.info('The View History', $ionicHistory.viewHistory());
	});
}]);
