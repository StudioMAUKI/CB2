angular.module('CB2.services', [])
.directive('fileModel', ['$parse', function ($parse) {
  return {
    restrict: 'A',
    link: function(scope, element, attrs) {
      var model = $parse(attrs.fileModel);
      var modelSetter = model.assign;

      element.bind('change', function(){
        scope.$apply(function(){
          modelSetter(scope, element[0].files[0]);
        });
      });
    }
  };
}])
.factory('PhotoService', ['$cordovaCamera', '$cordovaImagePicker', '$q', function($cordovaCamera, $cordovaImagePicker, $q) {
  function getPhotoFromCamera() {
    var deferred = $q.defer();

		if (ionic.Platform.isIOS() || ionic.Platform.isAndroid()) {
			var options = {
	      quality: 70,
	      destinationType: Camera.DestinationType.FILE_URI,
	      sourceType: Camera.PictureSourceType.CAMERA,
	      allowEdit: false,
	      encodingType: Camera.EncodingType.JPEG,
	      targetWidth: 1280,
	      targetHeight: 1280,
	      popoverOptions: CameraPopoverOptions,
	      correctOrientation: true,
	      saveToPhotoAlbum: false
	    };

	    $cordovaCamera.getPicture(options)
	    .then(function (imageURI) {
	      console.log('imageURI: ' + imageURI);
        deferred.resolve(imageURI);
	    }, function (err) {
	      console.error('Camera capture failed : ' + err);
        deferred.reject(err);
	    });
		} else {	// test in web-browser
      deferred.resolve('img/samples/sample_01.jpg');
		}

    return deferred.promise;
	};

	function getPhotosFromAlbum(reqCount) {
    var deferred = $q.defer();

		if (ionic.Platform.isIOS() || ionic.Platform.isAndroid()) {
			$cordovaImagePicker.getPictures({
	      maximumImagesCount: reqCount,
	      quality: 70,
        width: 1280,
				height: 1280
	    }).
	    then(function(imageURIs) {
        deferred.resolve(imageURIs);
	    }, function (error) {
	      console.error(err);
        deferred.reject(err);
	    });
		} else {	// test in web-browser
      deferred.resolve(['img/samples/sample_01.jpg']);
		}

    return deferred.promise;
	};

  return {
    getPhotoFromCamera: getPhotoFromCamera,
    getPhotosFromAlbum: getPhotosFromAlbum
  }
}])
.factory('DOMHelper', [function() {
  function getImageHeight(elem, cols, padding) {
    cols = cols || 3;
    padding = (padding === null) ? 5 : padding;

    if (!elem) {
      return 0;
    }

    var elems = document.getElementsByClassName(elem);
		console.log('elems[' + elem + '].length : ' + elems.length);
    for (var i = 0; i < elems.length; i++) {
			console.log('elems[' + elem + '].clientWidth : ' + elems[i].clientWidth);
      if (elems[i].clientWidth) {
				return parseInt((elems[i].clientWidth - (cols + 1) * padding) / cols);
      }
    }
    return 0;
  }

  return {
    getImageHeight: getImageHeight
  }
}])
.factory('CacheService', [function() {
  var data = {};

  return {
    set: function(key, value) {
      //  data[key] = value;
      return window.sessionStorage.setItem(key, JSON.stringify(value));
    },
    get: function(key) {
      // return data[key];
      try {
        return JSON.parse(window.sessionStorage.getItem(key));
      } catch (err) {
        return null;
      }
    },
    has: function(key) {
      // return !(data[key] === undefined);
      return (window.sessionStorage.getItem(key) !== null);
    },
    remove: function(key) {
      // data[key] = undefined;
      window.sessionStorage.removeItem(key);
    }
  }
}])
.factory('StorageService', [function() {
  function get(key) {
    try {
      return JSON.parse(window.localStorage.getItem(key));
    } catch (err) {
      return null;
    }
  }

  function set(key, value) {
    window.localStorage.setItem(key, JSON.stringify(value));
  }

  function remove(key) {
    window.localStorage.removeItem(key);  }

  return {
    get: get,
    set: set,
    remove: remove
  };
}])
.factory('PKAuthStorageService', ['$cordovaFile', '$q', 'StorageService', function($cordovaFile, $q, StorageService) {
  var dicSaved = {};
  var inited = false;
  var storageFileName = 'storage.txt';

  function init() {
    var deferred = $q.defer();

    if (inited) {
      console.log('PKAuthStorageService is already inited.');
      deferred.resolve();
    } else {
      if (ionic.Platform.isIOS() || ionic.Platform.isAndroid()) {
        //  저장을 위한 파일이 존재하는지 확인하고, 없다면 생성해 둔다
        $cordovaFile.checkFile(cordova.file.dataDirectory, storageFileName)
        .then(function (success) {
          $cordovaFile.readAsText(cordova.file.dataDirectory, storageFileName)
          .then(function (data) {
            console.log('data in storage.txt', data);
            try {
              if (data === null || data === '') {
                console.warn('The data in storage is empty.');
                inited = true;
                deferred.resolve();
              } else {
                dicSaved = JSON.parse(data);
                inited = true;
                deferred.resolve();
              }
            } catch (e) {
              console.error('The data in storage is broken.');
              //  이 경우 파일의 내용이 깨져서 JSON parsing이 안되는 경우이다.
              //  현재로썬 깔끔하게 지우고 다시 시작하는 것이 최선..
              $cordovaFile.removeFile(cordova.file.dataDirectory, storageFileName)
              .then(function() {
                $cordovaFile.createFile(cordova.file.dataDirectory, storageFileName, true)
                .then(function (success) {
                  console.log('New StorageFile have been created.');
                  inited = true;
                  dicSaved = {};
                  deferred.resolve();
                }, function (err) {
                  console.error('Cannot create the storage file.');
                  console.dir(err);
                  inited = false;
                  dicSaved = {};
                  deferred.reject(err);
                });
              }, function(err) {
                inited = false;
                deferred.reject(err);
              });
            }

          }, function (error) {
            cosole.error('Reading from the StorageFile was failed.');
            console.dir(error);

            inited = false;
            deferred.reject(error);
          });
        }, function (error) {
          console.error('StorageFile is not exist.');
          console.dir(error);

          $cordovaFile.createFile(cordova.file.dataDirectory, storageFileName, true)
          .then(function (success) {
            console.log('New StorageFile have been created.');
            inited = true;
            dicSaved = {};
            deferred.resolve();
          }, function (error) {
            console.error('Cannot create the storage file.');
            console.dir(error);
            inited = false;
            dicSaved = {};
            deferred.reject(error);
          });
        });
      } else {
        deferred.resolve();
      }
    }

    return deferred.promise;
  }

  function get(key) {
    if (ionic.Platform.isIOS() || ionic.Platform.isAndroid()) {
      console.log('PKAuthStorageService.get(' + key + ') :' + dicSaved[key]);
      // $cordovaFile.readAsText(cordova.file.dataDirectory, storageFileName)
      // .then(function (data) {
      //   console.dir(data);
      // }, function (error) {
      //   cosole.error('Reading from the StorageFile was failed.');
      //   console.dir(error);
      // });

      if (dicSaved[key]) {
        return JSON.parse(dicSaved[key]);
      } else {
        return null;
      }
    } else {
      return StorageService.get(key);
    }
  }

  function set(key, value) {
    if (ionic.Platform.isIOS() || ionic.Platform.isAndroid()) {
      console.log('PKAsyncStorageService.setItem(' + key + ', ' + value + ')');
      dicSaved[key] = JSON.stringify(value);
      saveToFile();
    } else {
      StorageService.set(key, value);
    }
  }

  function saveToFile() {
    //  파일 저장
    if (ionic.Platform.isIOS() || ionic.Platform.isAndroid()) {
      $cordovaFile.writeFile(cordova.file.dataDirectory, storageFileName, JSON.stringify(dicSaved), true)
      .then(function (success) {
      }, function (error) {
        console.error('Writing to storage file is failed.');
        console.dir(error);
      });
    }
  }

  function remove(key) {
    if (ionic.Platform.isIOS() || ionic.Platform.isAndroid()) {
      dicSaved[key] = null;
      saveToFile();
    } else {
      StorageService.remove(key);
    }
  }

  function reset() {
    inited = false;
    if (ionic.Platform.isIOS() || ionic.Platform.isAndroid()) {
      $cordovaFile.removeFile(cordova.file.dataDirectory, storageFileName)
      .then(function (success) {
        console.log('Removing storage file was successed.');
      }, function (error) {
        console.error('Removing storage file was failed.');
        console.dir(error);
      });
    }
  }

  return {
    init: init,
    get: get,
    set: set,
    remove: remove,
    reset: reset
  };
}])
.factory('starPointIconService', [function() {
  var starPointArray = [
    ['ion-ios-star-outline', 'ion-ios-star-outline', 'ion-ios-star-outline', 'ion-ios-star-outline', 'ion-ios-star-outline'],
    ['ion-ios-star-half', 'ion-ios-star-outline', 'ion-ios-star-outline', 'ion-ios-star-outline', 'ion-ios-star-outline'],
    ['ion-ios-star', 'ion-ios-star-outline', 'ion-ios-star-outline', 'ion-ios-star-outline', 'ion-ios-star-outline'],
    ['ion-ios-star', 'ion-ios-star-half', 'ion-ios-star-outline', 'ion-ios-star-outline', 'ion-ios-star-outline'],
    ['ion-ios-star', 'ion-ios-star', 'ion-ios-star-outline', 'ion-ios-star-outline', 'ion-ios-star-outline'],
    ['ion-ios-star', 'ion-ios-star', 'ion-ios-star-half', 'ion-ios-star-outline', 'ion-ios-star-outline'],
    ['ion-ios-star', 'ion-ios-star', 'ion-ios-star', 'ion-ios-star-outline', 'ion-ios-star-outline'],
    ['ion-ios-star', 'ion-ios-star', 'ion-ios-star', 'ion-ios-star-half', 'ion-ios-star-outline'],
    ['ion-ios-star', 'ion-ios-star', 'ion-ios-star', 'ion-ios-star', 'ion-ios-star-outline'],
    ['ion-ios-star', 'ion-ios-star', 'ion-ios-star', 'ion-ios-star', 'ion-ios-star-half'],
    ['ion-ios-star', 'ion-ios-star', 'ion-ios-star', 'ion-ios-star', 'ion-ios-star']
  ];

  return {
    get : function(index) {
      index = index || 0;
      return starPointArray[index];
    }
  }
}])
.service('LocationService', function($q){
  var autocompleteService = new google.maps.places.AutocompleteService();
  var detailsService = new google.maps.places.PlacesService(document.createElement("input"));
  return {
    searchAddress: function(input) {
      var deferred = $q.defer();

      autocompleteService.getPlacePredictions({
        input: input
      }, function(result, status) {
        if(status == google.maps.places.PlacesServiceStatus.OK){
          // console.log(status);
          deferred.resolve(result);
        }else{
          deferred.reject(status)
        }
      });

      return deferred.promise;
    },
    getDetails: function(placeId) {
      var deferred = $q.defer();
      detailsService.getDetails({placeId: placeId}, function(result) {
        deferred.resolve(result);
      });
      return deferred.promise;
    }
  };
})
.directive('locationSuggestion', function($ionicModal, LocationService, StorageService){
  return {
    restrict: 'A',
    scope: {
      location: '='
    },
    link: function($scope, element){
      console.log('locationSuggestion started!');
      $scope.search = {};
      $scope.search.suggestions = [];
      $scope.search.query = '';
      $ionicModal.fromTemplateUrl('views/home/modal-location.html', {
        scope: $scope,
        focusFirstInput: true
      }).then(function(modal) {
        $scope.modal = modal;
      });
      element[0].addEventListener('click', function(event) {
        $scope.open();
      });
      $scope.$watch('search.query', function(newValue) {
        if (newValue) {
          LocationService.searchAddress(newValue)
          .then(function(result) {
            // console.log('suggestions', result);
            $scope.search.error = null;
            for (var i = 0; i < result.length ; i++) {
              result[i].name = result[i].terms[0].value;
              result[i].region = '';
              for (var j = result[i].terms.length - 1; j > 0; j--) {
                result[i].region += result[i].terms[j].value + ' ';
              }
            }
            $scope.search.suggestions = result;
          }, function(status){
            console.error('There was an error :( ' + status)
            $scope.search.error = newValue;
          });
        };
        $scope.open = function() {
          $scope.modal.show();
        };
        $scope.close = function() {
          $scope.modal.hide();
        };
        $scope.choosePlace = function(place) {
          if (place.place_id !== -1) {
            LocationService.getDetails(place.place_id)
            .then(function(location) {
              $scope.location = location;
              $scope.location.type = 'google';
              $scope.location.lps = $scope.location.place_id + '.google';
              $scope.close();
            });
          } else {
            console.log($scope.search.query);
            $scope.location = {};
            $scope.location.type = 'mauki';
            $scope.location.name = $scope.search.query;
            $scope.location.lps = null;
            $scope.location.formatted_address = StorageService.get('addr1') || StorageService.get('addr2') || StorageService.get('addr3') || null;
            $scope.close();
          }
        };
      });
    }
  }
})
.factory('MapService', ['$q', 'StorageService', function($q, StorageService) {
  var pos = { latitude: 0.0, longitude: 0.0 };
  var warchID = null;

  function getCurrentPosition() {
    return $q(function(resolve, reject) {
      // console.info('in MapService.getCurrentPosition()');
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
          pos.latitude = position.coords.latitude;
          pos.longitude = position.coords.longitude;
          StorageService.set('curPos', pos);
          console.info('Original position is (' + pos.latitude + ', ' + pos.longitude + ').');

          resolve(pos);
        }, function(err) {
          console.error('MapService.getCurrentPosition() is failed.');
          console.dir(err);
          // PositionError
          // code:3
          // message:"Timeout expired"
          // __proto__:
          // PositionError
          // 	PERMISSION_DENIED:1
          // 	POSITION_UNAVAILABLE:2
          // 	TIMEOUT:3
          pos.latitude = 37.403425;
          pos.longitude = 127.105783;

          resolve(pos);
        }, {
          timeout: 5000,
          enableHighAccuracy: true,
          maximumAge: 30000
        });
      } else {
        reject('Browser doesn\'t support Geolocation');
      }
    });
  };

  function watchCurrentPosition(success, fail) {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(function(position) {
        pos.latitude = position.coords.latitude;
        pos.longitude = position.coords.longitude;
        StorageService.set('curPos', pos);
        console.info('Changed position is (' + pos.latitude + ', ' + pos.longitude + ').');

        success(pos);
      }, function(err) {
        console.error('MapService.watchCurrentPosition() is failed.');
        console.dir(err);
        fail(err);
      }, {
        timeout: 5000
        // enableHighAccuracy: true
      });
    } else {
      return -1;
    }
  }

  function clearWatch() {
    if (watchID != null) {
      if (navigator.geolocation) {
        navigator.geolocation.clearWatch(watchID);
      }
    }
  }

  function getCurrentAddress(latitude, longitude, saveAddr) {
    var deferred = $q.defer();
    if (saveAddr === null || saveAddr === undefined) {
      saveAddr = true;
    }

    var geocoder = new daum.maps.services.Geocoder();
    geocoder.coord2detailaddr(
      new daum.maps.LatLng(latitude, longitude),
      function(status, result) {
        // console.dir(status);
        // console.dir(result);
        if (status === daum.maps.services.Status.OK) {
          if (result[0]) {
            console.info('Current Address is ' + result[0].jibunAddress.name + '.');
            if (saveAddr) {
              StorageService.set('addr1', result[0].roadAddress.name);
        			StorageService.set('addr2', result[0].jibunAddress.name);
        			StorageService.set('addr3', result[0].region);
            }
            deferred.resolve(result[0]);
          } else {
            console.warn('Geocoder results are not found.');
            deferred.reject(status);
          }
        } else {
          console.error('Geocoder failed due to: ' + status);
          deferred.reject(status);
        }
      }
    );

    return deferred.promise;
  }

  return {
    getCurrentPosition: getCurrentPosition,
    getCurrentAddress: getCurrentAddress,
    watchCurrentPosition: watchCurrentPosition,
    clearWatch: clearWatch
  };
}]);
