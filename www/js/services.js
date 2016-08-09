angular.module('CB2.services', [])
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
}]);
