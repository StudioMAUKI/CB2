'use strict';

angular.module('CB2.services')
.factory('RESTServer', ['StorageService', function(StorageService) {
  return {
    getURL: function() {
      var devmode = StorageService.get('devmode') === "true" ? true : false;

      if (ionic.Platform.isIOS() || ionic.Platform.isAndroid()) {
        if (devmode) {
          return 'http://192.168.1.3:8000';
        } else {
          //return 'http://maukitest.cloudapp.net';
          return 'http://neapk-test01.japaneast.cloudapp.azure.com';
        }
      } else {
        if (devmode) {
          return '/mauki_dev';
        } else {
          return '/mauki';
        }
      }
    }
  }
}])
.factory('RemoteAPIService', ['$http', '$cordovaFileTransfer', '$q', 'RESTServer', 'StorageService', 'PostHelper', 'PKAuthStorageService', function($http, $cordovaFileTransfer, $q, RESTServer, StorageService, PostHelper, PKAuthStorageService){
  var getServerURL = RESTServer.getURL;
  var cachedUPAssigned = [];
  var cachedUPWaiting = [];
  var cacheKeys = ['all', 'uplaces', 'places', 'iplaces'];
  var cacheMngr = { uplaces: null, places: null, iplaces: null};

  function createCacheItem() {
    return {
      items: [],
      endOfList: false,
      lastUpdated: 0,
      needToUpdate: true,
      totalCount: 0
    };
  }

  function resetCacheItem(item) {
    item.items = [];
    item.endOfList = false;
    item.lastUpdated = 0;
    item.needToUpdate = true;
    item.totalCount = 0;
  }

  cacheMngr.uplaces = createCacheItem();
  cacheMngr.places = createCacheItem();
  cacheMngr.iplaces = createCacheItem();
  // console.dir(cacheMngr);

  function registerUser() {
    var deferred = $q.defer();
    var auth_user_token = '';

    PKAuthStorageService.init()
    .then(function() {
      auth_user_token = PKAuthStorageService.get('auth_user_token');
      if (auth_user_token) {
        console.log('User Registration already successed: ' + auth_user_token);
        deferred.resolve(auth_user_token);
      } else {
        // 이경우에는 auth_vd_token도 새로 발급받아야 하므로, 혹시 남아있을 auth_vd_token 찌꺼기를 지워줘야 한다.
        PKAuthStorageService.remove('auth_vd_token');

        $http({
          method: 'POST',
          url: getServerURL() + '/users/register/'
        })
        .then(function(result) {
          console.log('User Registration successed: ' + result.data.auth_user_token);
          // StorageService.set('auth_user_token', result.data.auth_user_token);
          PKAuthStorageService.set('auth_user_token', result.data.auth_user_token);
          deferred.resolve(result.data.auth_user_token);
        }, function(err) {
          deferred.reject(err);
        });
      }
    }, function() {
      console.error('인증 데이터 로딩 중 문제가 발생하여, 더이상 앱을 이용할 수 없음');
      deferred.reject('Error in registerUser');
    });

    return deferred.promise;
  }

  function loginUser(token) {
    var deferred = $q.defer();
    $http({
      method: 'POST',
      url: getServerURL() + '/users/login/',
      data: JSON.stringify({ auth_user_token: token })
    })
    .then(function(result) {
      deferred.resolve(result.data.result);
    }, function(err) {
      deferred.reject(err);
    });
    return deferred.promise;
  }

  function logoutUser(step) {
    console.log('Login Step: ' + step);
    step = step || 0;
    if (step <= 2){
      PKAuthStorageService.remove('auth_user_token');
    }

    if (step <= 4) {
      PKAuthStorageService.remove('email');
      PKAuthStorageService.remove('auth_vd_token');
    }
  }

  function registerVD() {
    var deferred = $q.defer();
    var auth_vd_token = PKAuthStorageService.get('auth_vd_token');
    var email = PKAuthStorageService.get('email');

    if (auth_vd_token) {
      console.log('VD Registration already successed: ' + auth_vd_token);
      deferred.resolve(auth_vd_token);
    } else {
      $http({
        method: 'POST',
        url: getServerURL() + '/vds/register/',
        data: JSON.stringify({ email: email, country:StorageService.get('country'), language:StorageService.get('lang'), timezone:'' })
      })
      .then(function(result) {
        console.log('VD Registration successed: ' + result.data.auth_vd_token);
        PKAuthStorageService.set('auth_vd_token', result.data.auth_vd_token);
        deferred.resolve(result.data.auth_vd_token);
      }, function(err) {
        deferred.reject(err);
      });
    }
    return deferred.promise;
  }

  function loginVD(token) {
    var deferred = $q.defer();
    $http({
      method: 'POST',
      url: getServerURL() + '/vds/login/',
      data: JSON.stringify({ auth_vd_token: token })
    })
    .then(function(result) {
      console.log('VD Login successed: ' + result.data.auth_vd_token);
      PKAuthStorageService.set('auth_vd_token', result.data.auth_vd_token);
      deferred.resolve(result.data.auth_vd_token);
    }, function(err) {
      deferred.reject(err);
    });
    return deferred.promise;
  }

  function hasEmail() {
    var email = PKAuthStorageService.get('email');
    return (email !== null);
  }

  function sendUserPost(sendObj){
    var deferred = $q.defer();
    $http({
      method: 'POST',
      url: getServerURL() + '/uplaces/',
      data: JSON.stringify({ add: JSON.stringify(sendObj) })
    })
    .then(function(result) {
      setAllNeedToUpdate();
      deferred.resolve(result);
    }, function(err) {
      console.error(err);
      deferred.reject(err);
    });
    return deferred.promise;
  }

  function deleteUserPost(uplace_uuid) {
    var deferred = $q.defer();
    var ret_uplace_uuid = uplace_uuid.split('.')[0];
    $http({
      method: 'DELETE',
      url: getServerURL() + '/uplaces/' + ret_uplace_uuid + '/'
    })
    .then(function(result) {
      var idOrganized = -1, idUnorganized = -1;
      for (var i = 0; i < cacheMngr.uplaces.items.length; i++) {
        if (PostHelper.isOrganized(cacheMngr.uplaces.items[i])) {
          idOrganized++;
        } else {
          idUnorganized++;
        }
        if (uplace_uuid === cacheMngr.uplaces.items[i].uplace_uuid) {
          if (PostHelper.isOrganized(cacheMngr.uplaces.items[i])) {
            cachedUPAssigned.splice(idOrganized, 1);
          } else {
            cachedUPWaiting.splice(idUnorganized, 1);
          }
          cacheMngr.uplaces.items.splice(i, 1);
        }
      }
      setAllNeedToUpdate();
      deferred.resolve(result);
    }, function(err) {
      console.error(err);
      deferred.reject(err);
    });
    return deferred.promise;
  }

  function deleteContentInUserPost(delObj) {
    var deferred = $q.defer();
    $http({
      method: 'POST',
      url: getServerURL() + '/uplaces/',
      data: JSON.stringify({ remove: JSON.stringify(delObj) })
    })
    .then(function(result) {
      setAllNeedToUpdate();
      deferred.resolve(result);
    }, function(err) {
      console.dir(err);
      deferred.reject(err);
    });
    return deferred.promise;
  }

  function uploadImage(fileURI) {
    var deferred = $q.defer();

    // browser에서 개발하는 거 때문에 할수 없이 분기해서 처리..
    if (ionic.Platform.isIOS() || ionic.Platform.isAndroid()) {
      var options = {
        fileKey: 'file',
        httpMethod: 'POST'
      };
      $cordovaFileTransfer.upload(getServerURL() + '/rfs/', fileURI, options)
      .then(function(result) {
        // console.dir(result.response);
        var res;
        try {
          res = JSON.parse(result.response);
          deferred.resolve(res);
        } catch (e) {
          console.error(e.message);
          deferred.reject(e);
        }
      }, function(err) {
        console.error(err);
        deferred.reject(err);
      });
    } else {
      var fd = new FormData();
      fd.append('file', fileURI);
      $http.post(getServerURL() + '/rfs/', fd, {
        transformRequest: angular.identity,
        headers: { 'Content-Type': undefined }
      })
      .then(function(result) {
        //console.dir(result);
        deferred.resolve(result.data);
      }, function(err) {
        console.error(err);
        deferred.reject(err);
      })
      //deferred.resolve({uuid: '0DC200ED17A056ED448EF8E1C3952B94.img'});
    }
    return deferred.promise;
  }

  function resetCachedPosts(type) {
    type = type || 'all';

    if (cacheKeys.indexOf(type) === -1) {
      console.warn('resetCachedPosts : unknown cache key[' + type + ']');
      return;
    }

    if (type === 'all') {
      resetCacheItem(cacheMngr.uplaces);
      resetCacheItem(cacheMngr.iplaces);
      resetCacheItem(cacheMngr.places);
      cachedUPAssigned = [];
      cachedUPWaiting = [];
    } else if (type === 'uplaces') {
      cachedUPAssigned = [];
      cachedUPWaiting = [];
      resetCacheItem(cacheMngr.uplaces);
    } else if (type === 'places') {
      resetCacheItem(cacheMngr.places);
    } else if (type === 'iplaces'){
      resetCacheItem(cacheMngr.iplaces);
    }
  }

  function isEndOfList(key) {
    return cacheMngr[key].endOfList;
  }

  function setAllNeedToUpdate() {
    for (var item in cacheMngr) {
      cacheMngr[item].needToUpdate = true;
    }
  }

  //  캐싱 로직은 세가지 요소 검사
  //  1. 현재 캐싱된 리스트가 비어 있는가?
  //  2. 마지막으로 업데이트 한 시간에서 1분이 지났는가?
  //  3. 업데이트 태그가 설정되어 있는가?
  function checkNeedToRefresh(key) {
    //  잠시 캐시 기능을 꺼보기로 함
    return true;

    if (cacheKeys.indexOf(key) === -1) {
      console.warn('등록되지 않은 키(' + key + ')로 업데이트 여부를 체크했음')
      return true;
    }
    if (cacheMngr[key].items.length === 0) {
      console.log(key + ' 업데이트 필요 : 리스트가 비어 있음');
      return true;
    }

    var timeNow = new Date().getTime();
    if (timeNow - cacheMngr[key].lastUpdated >= 60000) {
      console.log('업데이트 필요 : 너무 오래 업데이트를 안 했음');
      return true;
    }
    if (cacheMngr[key].needToUpdate) {
      console.log('업데이트 필요 : 업데이트 필요 태그가 세팅 됨');
      return true;
    }
    console.log('업데이트 필요 없음');
    // console.log('key : ' + key);
    // console.log('timeNow : ' + timeNow);
    // console.log('lastUpdated : ' + cacheMngr[key].lastUpdated);
    // console.log('needToUpdate : ' + cacheMngr[key].needToUpdate);
    return false;
  }

  function setRefreshCompleted(key) {
    cacheMngr[key].needToUpdate = false;
    cacheMngr[key].lastUpdated = new Date().getTime();
  }

  function updateCurPos(curPos) {
    if (cachedUPAssigned.length > 0) {
      PostHelper.updateDistance(cachedUPAssigned, curPos);
    }
    for (var item in cacheMngr) {
      if (cacheMngr[item].items.length > 0) {
        PostHelper.updateDistance(cacheMngr[item].items, curPos);
      }
    }
  }

  function getPostsOfMine(position, orderBy, lon, lat, radius, maxLimit) {
    console.info('getPostsOfMine : ' + position);
    var deferred = $q.defer();
    var offset, limit;
    position = position || 'top';
    orderBy = orderBy || '-modified';
    // if (orderBy === '-modified' || orderBy === 'modified') {
    //   lon = null;
    //   lat = null;
    //   radius = 0;
    // } else {
      lon = lon || null;
      lat = lat || null;
      radius = radius || 0;
      maxLimit = maxLimit || 0;
    // }

    if (position === 'top') {
      offset = 0;
      limit = 20;
      resetCachedPosts('uplaces');
    } else if (position === 'bottom') {
      offset = cacheMngr.uplaces.items.length;
      limit = 20;

      if (cacheMngr.uplaces.endOfList) {
        console.log('리스트의 끝에 다달았기 때문에 바로 리턴.');
        deferred.reject('endOfList');
        return deferred.promise;
      } else {
        cacheMngr.uplaces.needToUpdate = true;  // 아래쪽에서 리스트를 추가하는 것은 항상 갱신을 시도해야 한다
      }
    } else {
      deferred.reject('Wrong parameter.');
      return deferred.promise;
    }

    if (checkNeedToRefresh('uplaces')) {
      $http({
        method: 'GET',
        url: getServerURL() + '/uplaces/',
        params: {
          ru: 'myself',
          limit: limit,
          offset: offset,
          order_by: orderBy,
          lon: lon,
          lat: lat,
          r: radius
        }
      })
      .then(function(response) {
        // console.dir(response.data.results);
        cacheMngr.uplaces.totalCount = response.data.count;
        PostHelper.decoratePosts(response.data.results);
        if (position === 'top') {
          var newElements = [];
          var found = false;
          for (var i = 0; i < response.data.results.length; i++) {
            found = false;
            for (var j = 0; j < cacheMngr.uplaces.items.length; j++) {
              // console.log(j);
              if (response.data.results[i].uplace_uuid === cacheMngr.uplaces.items[j].uplace_uuid) {
                found = true;
                break;
              }
            }
            if (!found) {
              newElements.push(response.data.results[i]);
            }
          }
          cacheMngr.uplaces.items = newElements.concat(cacheMngr.uplaces.items);
        } else {  //  position === 'bottom'
          if (response.data.results.length === 0) {
            cacheMngr.uplaces.endOfList = true;
          } else {
            cacheMngr.uplaces.items = cacheMngr.uplaces.items.concat(response.data.results);
          }
        }

        cachedUPAssigned = [];
        cachedUPWaiting = [];
        // PostHelper.decoratePosts(cacheMngr.uplaces.items);
        for (var i = 0; i < cacheMngr.uplaces.items.length; i++) {
          if (PostHelper.isOrganized(cacheMngr.uplaces.items[i])) {
            cachedUPAssigned.push(cacheMngr.uplaces.items[i]);
          } else {
            cachedUPWaiting.push(cacheMngr.uplaces.items[i]);
          }
        }
        deferred.resolve({assigned : cachedUPAssigned, waiting: cachedUPWaiting, totalCount: cacheMngr.uplaces.totalCount});
      }, function(err) {
        console.error(err);
        deferred.reject(err);
      })
      .finally(function() {
        setRefreshCompleted('uplaces');
      });
    } else {
      deferred.resolve({assigned : cachedUPAssigned, waiting: cachedUPWaiting, totalCount: cacheMngr.uplaces.totalCount});
    }

    return deferred.promise;
  }

  function getPostsWithPlace(lat, lon, radius) {
    console.log('lat: ' + lat + ', lon: ' + lon + ', radius: ' + radius);
    var deferred = $q.defer();

    //  위치에 따라 리스트를 불러오는 로직에 캐시를 적용하는게 좋을지는 좀 더 고민해봐야겠어서 일단 주석처리
    // if (checkNeedToRefresh('places')) {
      $http({
        method: 'GET',
        url: getServerURL() + '/uplaces/',
        params: {
          lon: lon,
          lat: lat,
          r: radius
        }
      })
      .then(function(response) {
        // console.dir(response);
        cacheMngr.places.items = [];
        cacheMngr.places.totalCount = response.data.count;
        for (var i = 0; i < response.data.results.length; i++){
          if (response.data.results[i].lonLat) {
            cacheMngr.places.items.push(response.data.results[i]);
          }
        }
        PostHelper.decoratePosts(cacheMngr.places.items);
        // console.dir(cacheMngr.places.items);
        deferred.resolve(cacheMngr.places.items);
      }, function(err) {
        console.error(err);
        deferred.reject(err);
      })
      .finally(function() {
        setRefreshCompleted('places');
      });
    // } else {
    //   deferred.resolve(cacheMngr.places.items);
    // }

    return deferred.promise;
  }

  function importUser(userEmail) {
    var deferred = $q.defer();
    $http({
      method: 'POST',
      url: getServerURL() + '/importers/',
      data: JSON.stringify({ guide: JSON.stringify({ type: 'user', email: userEmail })})
    })
    .then(function(result) {
      // console.dir(result);
      deferred.resolve(result);
    }, function(err) {
      console.error(err);
      deferred.reject(err);
    });
    return deferred.promise;
  }

  function importImage() {
    var deferred = $q.defer();
    $http({
      method: 'POST',
      url: getServerURL() + '/importers/',
      data: JSON.stringify({ guide: JSON.stringify({ type: 'images', vd: 'myself' })})
    })
    .then(function(result) {
      // console.dir(result);
      deferred.resolve(result);
    }, function(err) {
      console.error(err);
      deferred.reject(err);
    });
    return deferred.promise;
  }

  function getIplaces(position, lat, lon) {
    var deferred = $q.defer();
    var offset, limit;
    position = position || 'top';

    if (position === 'top') {
      offset = 0;
      limit = 20;
      resetCachedPosts('iplaces');
    } else if (position === 'bottom') {
      offset = cacheMngr.iplaces.items.length;
      limit = 20;

      if (cacheMngr.iplaces.endOfList) {
        console.log('리스트의 끝에 다달았기 때문에 바로 리턴.');
        deferred.reject('endOfList');
        return deferred.promise;
      } else {
        cacheMngr.iplaces.needToUpdate = true;  // 아래쪽에서 리스트를 추가하는 것은 항상 갱신을 시도해야 한다
      }
    } else {
      deferred.reject('Wrong parameter.');
      return deferred.promise;
    }

    if (checkNeedToRefresh('iplaces')) {
      $http({
        method: 'GET',
        url: getServerURL() + '/iplaces/',
        params: {
          ru: 'myself',
          limit: limit,
          offset: offset,
          lat: lat,
          lon: lon,
          r: 0
        }
      })
      .then(function(response) {
        // console.dir(response);
        cacheMngr.iplaces.totalCount = response.data.count;
        PostHelper.decoratePosts(response.data.results);
        if (position === 'top') {
          var newElements = [];
          var found = false;
          for (var i = 0; i < response.data.results.length; i++) {
            found = false;
            for (var j = 0; j < cacheMngr.iplaces.items.length; j++) {
              // console.log(j);
              if (response.data.results[i].iplace_uuid === cacheMngr.iplaces.items[j].iplace_uuid) {
                found = true;
                break;
              }
            }
            if (!found) {
              newElements.push(response.data.results[i]);
            }
          }
          cacheMngr.iplaces.items = newElements.concat(cacheMngr.iplaces.items);
        } else {  //  position === 'bottom'
          if (response.data.results.length === 0) {
            cacheMngr.iplaces.endOfList = true;
          } else {
            cacheMngr.iplaces.items = cacheMngr.iplaces.items.concat(response.data.results);
          }
        }

        deferred.resolve({ iplaces: cacheMngr.iplaces.items, totalCount: cacheMngr.iplaces.totalCount });
      }, function(err) {
        console.error(err);
        deferred.reject(err);
      })
      .finally(function() {
        setRefreshCompleted('iplaces');
      });
    } else {
      deferred.resolve({iplaces : cacheMngr.iplaces.items, totalCount: cacheMngr.iplaces.totalCount });
    }

    return deferred.promise;
  }

  function takeIplace(iplace_uuid) {
    var deferred = $q.defer();
    var ret_uplace_uuid = iplace_uuid.split('.')[0];
    console.log('ret_uplace_uuid : ' + ret_uplace_uuid);
    $http({
      method: 'POST',
      url: getServerURL() + '/iplaces/' + ret_uplace_uuid + '/take/'
    })
    .then(function(response) {
      // console.dir(response);
      for (var i = 0; i < cacheMngr.iplaces.items.length; i++) {
        if (cacheMngr.iplaces.items[i].iplace_uuid === iplace_uuid) {
          cacheMngr.iplaces.items.splice(i, 1);
          cacheMngr.iplaces.totalCount--;
        }
      }
      deferred.resolve({ iplaces: cacheMngr.iplaces.items, totalCount: cacheMngr.iplaces.totalCount });
    }, function(err) {
      console.error(err);
      deferred.reject(err);
    });

    return deferred.promise;
  }

  function dropIplace(iplace_uuid) {
    var deferred = $q.defer();
    var ret_uplace_uuid = iplace_uuid.split('.')[0];
    console.log('ret_uplace_uuid : ' + ret_uplace_uuid);
    $http({
      method: 'POST',
      url: getServerURL() + '/iplaces/' + ret_uplace_uuid + '/drop/'
    })
    .then(function(response) {
      // console.dir(response);
      for (var i = 0; i < cacheMngr.iplaces.items.length; i++) {
        if (cacheMngr.iplaces.items[i].iplace_uuid === iplace_uuid) {
          cacheMngr.iplaces.items.splice(i, 1);
          cacheMngr.iplaces.totalCount--;
        }
      }
      deferred.resolve({ iplaces: cacheMngr.iplaces.items, totalCount: cacheMngr.iplaces.totalCount });
    }, function(err) {
      console.error(err);
      deferred.reject(err);
    });

    return deferred.promise;
  }

  function getPost(uplace_uuid) {
    var deferred = $q.defer();
    var foundPost = null;
    var ret_uplace_uuid = uplace_uuid.split('.')[0];

    // 직접 질의
    $http({
      method: 'GET',
      url: getServerURL() + '/uplaces/' + ret_uplace_uuid + '/'
    })
    .then(function(response) {
      // console.dir(response.data);
      PostHelper.decoratePost(response.data);
      deferred.resolve(response.data);
    }, function(err) {
      console.error(err);
      deferred.reject(err);
    });

    return deferred.promise;
  }

  function getShortenURL(uplace_uuid) {
    //  http://neapk-test01.japaneast.cloudapp.azure.com/uplaces/00000154DCF3D3CE00000000008AFAE5/shorten_url/

    var deferred = $q.defer();

    console.log('GET request to ' + getServerURL() + '/uplaces/' + uplace_uuid + '/shorten_url/');
    uplace_uuid = uplace_uuid.replace('.uplace', '');
    $http({
      method: 'GET',
      url: getServerURL() + '/uplaces/' + uplace_uuid + '/shorten_url/'
    })
    .then(function(response) {
      // console.dir(response);
      deferred.resolve(response.data.shorten_url);
    }, function(err) {
      console.error(err);
      deferred.reject(err);
    });

    return deferred.promise;
  }

  return {
    registerUser: registerUser,
    loginUser: loginUser,
    logoutUser: logoutUser,
    registerVD: registerVD,
    loginVD: loginVD,
    hasEmail: hasEmail,
    sendUserPost: sendUserPost,
    deleteUserPost: deleteUserPost,
    deleteContentInUserPost: deleteContentInUserPost,
    uploadImage: uploadImage,
    getPostsOfMine: getPostsOfMine,
    getPostsWithPlace: getPostsWithPlace,
    getPost: getPost,
    updateCurPos: updateCurPos,
    resetCachedPosts: resetCachedPosts,
    isEndOfList: isEndOfList,
    importUser: importUser,
    importImage: importImage,
    getIplaces: getIplaces,
    takeIplace: takeIplace,
    dropIplace: dropIplace,
    getShortenURL: getShortenURL
  }
}])
.factory('PostHelper', ['RESTServer', 'StorageService', function(RESTServer, StorageService) {
  function getTags(post) {
    if (!post.userPost || !post.userPost.notes || post.userPost.notes.length === 0) {
      return [];
    }

    return getTagsWithContent(post.userPost.notes);
  }

  function getTagsWithContent(notes) {
    var words = [];
    var output = [];
    var subTags = [];
    for (var i = 0; i < notes.length; i++) {
      if (notes[i].content.indexOf('[NOTE_TAGS]') === -1) {
        words = notes[i].content.split(/\s+/);
        for (var j = 0; j < words.length; j++) {
          //  !!! 이거 열라 중요함! iOS 9.0 이상을 제외한 현재의 모바일 브라우저는 string.prototype.startsWith를 지원안함!
          //  덕분에 안드로이드에서는 태그가 작동안하던 버그가 있었음.
          if (words[j].charAt(0) === '#') {
            output.push(words[j].substring(1));
          }
        }
      } else {
        try{
          console.log(notes[i].content);
          subTags = JSON.parse(notes[i].content.split('#')[1]);
          output = output.concat(subTags);
        } catch (e) {
          console.error(e.message);
        }
      }
    }
    return output;
  }

  function getDescFromUserNote(post) {
    if (!post.userPost || !post.userPost.notes || post.userPost.notes.length == 0 || post.userPost.notes[0].content === '') {
      return '';
    }

    return getUserNoteByContent(post.userPost.notes);
  }

  function getUserNoteByContent(notes) {
    for (var i = 0; i < notes.length; i++) {
      if (notes[i].content.indexOf('[NOTE_TAGS]') === -1) {
        if (notes[i].content !== '') {
          return notes[i].content;
        }
      }
    }

    return '';
  }

  function getThumbnailURLByFirstImage(post) {
    if (!post.userPost || !post.userPost.images || post.userPost.images.length == 0) {
      if (!post.placePost || !post.placePost.images || post.placePost.images.length == 0) {
        return 'img/icon/404.png';
      } else {
        return getImageURL(post.placePost.images[0].summary);
      }
    } else {
      return getImageURL(post.userPost.images[0].summary);
    }
  }

  function getImageURL(content) {
    if (content === undefined || !content || content === '') {
      return 'img/icon/404.png';
    }

    if (content.indexOf('http://') !== 0) {
      return RESTServer.getURL() + '/' + content;
    }

    return content;
  }

  function getPlaceName(post) {
    // 장소의 이름은 공식 포스트의 이.content름을 우선한다.
    if (post.placePost && post.placePost.name && post.placePost.name.content !== '') {
      return post.placePost.name.content;
    } else if (post.userPost && post.userPost.name && post.userPost.name.content !== ''){
      return post.userPost.name.content;
    } else {
      return '';
    }
  }

  function getAddress(post) {
    // 주소는 공식 포스트의 주소를 우선한다.
    var addr = '';
    if (post.placePost) {
      if (post.placePost.addr1 && post.placePost.addr1.content !== '') {
        addr = post.placePost.addr1.content;
      }
      if (post.placePost.addr2 && post.placePost.addr2.content !== '') {
        if (addr.length === 0) {
          addr = post.placePost.addr2.content;
        } else {
          addr += ', ' + post.placePost.addr2.content;
        }
      }
      if (post.placePost.addr3 && post.placePost.addr3.content !== '') {
        if (addr.length === 0) {
          addr = post.placePost.addr3.content;
        } else {
          addr += ', ' + post.placePost.addr3.content;
        }
      }
    } else if (post.userPost) {
      if (post.userPost.addr1 && post.userPost.addr1.content !== '') {
        addr = post.userPost.addr1.content;
      }
      if (post.userPost.addr2 && post.userPost.addr2.content !== '') {
        if (addr.length === 0) {
          addr = post.userPost.addr2.content;
        } else {
          addr += ', ' + post.userPost.addr2.content;
        }
      }
      if (post.userPost.addr3 && post.userPost.addr3.content !== '') {
        if (addr.length === 0) {
          addr = post.userPost.addr3.content;
        } else {
          addr += ', ' + post.userPost.addr3.content;
        }
      }
    }

    return addr;
  }

  function getAddresses(post) {
    // 주소는 공식 포스트의 주소를 우선한다.
    var addrs = [];
    if (post.placePost) {
      if (post.placePost.addr1 && post.placePost.addr1.content !== '') {
        addrs.push(post.placePost.addr1.content);
      }
      if (post.placePost.addr2 && post.placePost.addr2.content !== '') {
        addrs.push(post.placePost.addr2.content);
      }
      if (post.placePost.addr3 && post.placePost.addr3.content !== '') {
        addrs.push(post.placePost.addr3.content);
      }
    } else if (post.userPost) {
      if (post.userPost.addr1 && post.userPost.addr1.content !== '') {
        addrs.push(post.userPost.addr1.content);
      }
      if (post.userPost.addr2 && post.userPost.addr2.content !== '') {
        addrs.push(post.userPost.addr2.content);
      }
      if (post.userPost.addr3 && post.userPost.addr3.content !== '') {
        addrs.push(post.userPost.addr3.content);
      }
    }

    return addrs;
  }

  function getShortenAddress(addr) {
    var a = addr.split(' ');
    var city = '';
    var startIndex = 0;
    if (a[0].indexOf('경기') !== -1 || a[0].indexOf('강원') !== -1 || a[0].indexOf('충북') !== -1 || a[0].indexOf('충남') !== -1 || a[0].indexOf('전북') !== -1 || a[0].indexOf('전남') !== -1 || a[0].indexOf('경북') !== -1 || a[0].indexOf('경남') !== -1) {
      city = a[1];
      startIndex = 1;
    } else {
      city = a[0].replace('특별시', '').replace('광역시', '');
      startIndex = 0;
    }
    // console.log(a[startIndex + 2], a[startIndex]);
    return a[startIndex + 2] + '.' + city;
  }

  function getPhoneNo(post) {
    // 전화번호는 공식 포스트의 전화번호를 우선한다.
    if (post.placePost && post.placePost.phone && post.placePost.phone.content !== '') {
      return post.placePost.phone.content;
    } else if (post.userPost && post.userPost.phone && post.userPost.phone.content !== '') {
      return post.userPost.phone.content;
    } else {
      return '';
    }
  }

  function isOrganized(post) {
    //  placePost가 NULL이 아니면 장소화 된 것으로 간주할 수있음
    return (post.place_id !== null);
  }

  function getTimeString(timestamp) {
    var timegap = (Date.now() - timestamp) / 1000;
    //console.info('timegap : ' + timegap);
    if (timegap < 3600) {
      var min = parseInt(timegap / 60);
      if (min === 0) {
        return '방금';
      } else {
        return parseInt(timegap / 60) + '분전';
      }
    } else if (timegap < 24 * 3600) {
      return parseInt(timegap / 3600) + '시간전';
    } else {
      return parseInt(timegap / 86400) + '일전';
    }
    // return new Date(timestamp).toLocaleDateString();
  }

  function calcDistance(lat1, lon1, lat2, lon2)
	{
    function deg2rad(deg) {
  	  return (deg * Math.PI / 180);
  	}
  	function rad2deg(rad) {
  	  return (rad * 180 / Math.PI);
  	}

	  var theta = lon1 - lon2;
	  var dist = Math.sin(deg2rad(lat1)) * Math.sin(deg2rad(lat2)) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.cos(deg2rad(theta));
	  dist = Math.acos(dist);
	  dist = rad2deg(dist);
	  dist = dist * 60 * 1.1515;
	  dist = dist * 1.609344;
	  var result = Number(dist*1000).toFixed(0);
    if (result < 1000) {
      return result + 'm';
    } else {
      return Number(result/1000.0).toFixed(1) + 'km';
    }
	}

  function getDistance(post, curPos) {
    if (post.lonLat) {
      return calcDistance(curPos.latitude, curPos.longitude, post.lonLat.lat, post.lonLat.lon);
    } else {
      return null;
    }
  }

  //  ng-repeat안에서 함수가 호출되는 것을 최대한 방지하기 위해, 로딩된 포스트의 썸네일 URL, 전화번호, 주소, 태그 등을
  //  계산해서 속성으로 담아둔다.
  function decoratePost(post) {
    // var curPos = StorageService.get('curPos');
    post.name = getPlaceName(post);
    post.thumbnailURL = getThumbnailURLByFirstImage(post);
    post.datetime = getTimeString(post.modified);
    // post.address = getAddress(post);
    post.addrs = getAddresses(post);
    post.address = post.addrs.length > 0 ? getShortenAddress(post.addrs[0]) : '주소 없음';
    post.desc = getDescFromUserNote(post);
    post.phoneNo = getPhoneNo(post);
    if (!post.userPost.tags) {
      post.userPost.tags = [];
    }
    post.visited = post.userPost.visit? post.userPost.visit.content : false;
    if (post.visited === false) {
      if (post.userPost.rating && parseInt(post.userPost.rating.content) > 0) {
        post.visited = true;
      }
    }
    //  서버로부터 받은 distance_from_origin은 질의때 보낸 좌표를 기준으로 한 거리이기 때문에
    //  현재 위치를 기준으로 다시 계산해야 한다.
    // post.distance_from_origin = getDistance(post, curPos);
  }

  function decoratePosts(posts) {
    for (var i = 0; i < posts.length; i++) {
      decoratePost(posts[i]);
    }
  }

  function updateDistance(posts, curPos) {
    for (var i = 0; i < posts.length; i++) {
      posts[i].distance_from_origin = getDistance(posts[i], curPos);
    }
  }

  function getReadablePhoneNo(phoneNo) {
    if (typeof phoneNo === 'string') {
      phoneNo = '0' + phoneNo.replace('+82', '');
      return phoneNo.replace(/(^02.{0}|^01.{1}|[0-9]{3})([0-9]+)([0-9]{4})/,"$1-$2-$3");
    } else {
      return null;
    }
  }

  return {
    getTagsWithContent: getTagsWithContent,
    getImageURL: getImageURL,
    isOrganized: isOrganized,
    getTimeString: getTimeString,
    decoratePost: decoratePost,
    decoratePosts: decoratePosts,
    updateDistance: updateDistance,
    calcDistance: calcDistance,
    getReadablePhoneNo: getReadablePhoneNo
  }
}]);
