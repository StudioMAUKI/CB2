'use strict';

angular.module('CB2.controllers')
.controller('saveFirstCtrl', ['$scope', '$ionicPopup', '$ionicHistory', '$state', '$ionicModal', 'PhotoService', 'DOMHelper', function($scope, $ionicPopup, $ionicHistory, $state, $ionicModal, PhotoService, DOMHelper) {
  var saveFirst = this;
  saveFirst.attatchedImages = [];
  saveFirst.note = '';
  saveFirst.placeNameForSave = '';
  saveFirst.locationBtnPlaceHolder = '어디인가요? 장소 이름을 직접 입력할 수 있습니다';
  saveFirst.gPlace = null;

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

  function divToFit() {
    console.log('call divToFit');
		var documentHeight = $(document).height();
		var barHeight = document.getElementsByTagName('ion-header-bar')[0].clientHeight || 44;
    $('#map').css({
			height: documentHeight
        - barHeight
		});
    //  이거 꼭 해줘야 지도가 제대로 그려짐. (안그러면 걍 회색으로 나옴)
    // google.maps.event.trigger(map.mapObj, 'resize');
	};

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
      divToFit();
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
