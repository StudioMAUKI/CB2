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
            dicSaved = JSON.parse(data);
            inited = true;
            deferred.resolve();
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
}]);
