'use strict';

angular.module('CB2.controllers')
.controller('placesCtrl', ['$scope', '$ionicScrollDelegate', '$ionicPopover', '$ionicPopup', '$state', '$stateParams', '$q', '$ionicListDelegate', '$ionicLoading', 'RemoteAPIService', 'PostHelper', 'StorageService', 'starPointIconService', function($scope, $ionicScrollDelegate, $ionicPopover, $ionicPopup, $state, $stateParams, $q, $ionicListDelegate, $ionicLoading, RemoteAPIService, PostHelper, StorageService, starPointIconService) {
	var places = this;
	places.postHelper = PostHelper;
	places.orderingTypeName = ['-modified', 'modified', 'distance_from_origin', '-distance_from_origin'];
	places.orderingType = $stateParams.latitude && $stateParams.longitude && $stateParams.radius ? 2 : 0;
	places.showDelete = false;
	places.notYetCount = 0;
	places.itemHeight = '99px';
	places.itemWidth = window.innerWidth + 'px';
	places.completedFirstLoading = false;
	places.totalCount = 0;
	places.SPS = starPointIconService;
	places.regionName = $stateParams.rname ? decodeURI($stateParams.rname) : '';
	places.longitude = parseFloat($stateParams.longitude);
	places.latitude = parseFloat($stateParams.latitude);
	places.radius = parseFloat($stateParams.radius);

	places.popOverOrdering = function(event) {
		$ionicPopover.fromTemplateUrl('popover-ordering.html', {
			scope: $scope,
		})
		.then(function(popover){
			places.popOver = popover;
			places.popOver.show(event);
		});
	};

	places.isActiveMenu = function(orderingType) {
		return places.orderingType === orderingType;
	};

	places.changeOrderingType = function(type) {
		places.popOver.hide();
		if (places.orderingType !== type) {
			places.orderingType = type;
			places.loadSavedPlace('top')
			.then(function() {
				$ionicScrollDelegate.scrollTop();
			});
		}
	};

	places.delete = function(post) {
		$ionicPopup.confirm({
			title: '장소 삭제',
			template: '정말로 저장한 장소를 지우시겠습니까?'
		})
		.then(function(res){
			if (res) {
				RemoteAPIService.deleteUserPost(post.uplace_uuid)
		    .then(function() {
		      $ionicPopup.alert({
		        title: '성공',
		        template: '삭제되었습니다'
		      });
		    }, function(err) {
		      console.error(err);
		    })
				.finally(function(){
					$ionicListDelegate.closeOptionButtons();
					// places.loadSavedPlace();
				});
			} else {
				$ionicListDelegate.closeOptionButtons();
			}
		});
	};

	places.loadSavedPlace = function(position) {
		console.log('loadSavedPlace : ' + position);
		var deferred = $q.defer();
		position = position || 'top';
		var lon, lat, radius, limit;

		// console.dir($stateParams);
		if ($stateParams.latitude && $stateParams.longitude && $stateParams.radius) {
			lat = parseFloat($stateParams.latitude);;
			lon = parseFloat($stateParams.longitude);;
			radius = parseInt($stateParams.radius) || 100;
			limit = parseInt($stateParams.limit);
		} else {
			var curPos = StorageService.get('curPos') || { latitude: 37.5666103, longitude: 126.9783882 };
			lon = curPos.longitude || null;
			lat = curPos.latitude || null;
			radius = 0;
			limit = 0;
		}

		if (places.completedFirstLoading === false) {
			$ionicLoading.show({
				template: '<ion-spinner icon="lines">로딩 중..</ion-spinner>'
			});
		}
		console.log('getPostsOfMine', position, places.orderingTypeName[places.orderingType], lon, lat, radius);
		RemoteAPIService.getPostsOfMine(position, places.orderingTypeName[places.orderingType], lon, lat, radius, limit)
		.then(function(result) {
			places.posts = result.assigned;
			places.notYetCount = result.waiting.length;
			places.totalCount = result.totalCount;
			deferred.resolve();
			// console.dir(places.posts);
		}, function(err) {
			console.error(err);
			deferred.reject(err);
		})
		.finally(function() {
			if (places.completedFirstLoading === false) {
				$ionicLoading.hide();
				places.completedFirstLoading = true;
			}
		});

		return deferred.promise;
	};

	places.isEndOfList = function() {
		return RemoteAPIService.isEndOfList('uplaces');
	};

	places.doRefresh = function(direction) {
		console.log('doRefersh : ' + direction);
		if (places.completedFirstLoading){
			if (direction === 'top') {
				places.loadSavedPlace('top')
				.finally(function(){
					$scope.$broadcast('scroll.refreshComplete');
				});
			} else if (direction === 'bottom') {
				places.loadSavedPlace('bottom')
				.finally(function(){
					$scope.$broadcast('scroll.infiniteScrollComplete');
				});
			}
		} else {
			if (direction === 'top') {
				$scope.$broadcast('scroll.refreshComplete');
			} else if (direction === 'bottom') {
				$scope.$broadcast('scroll.infiniteScrollComplete');
			}
		}
	};

	places.goToMap = function() {
		var lonLat = {
			lat: places.latitude,
			lon: places.longitude,
			radius: places.radius
		};
    console.log('goToMap : ' + JSON.stringify(lonLat));
    //  이거 타임아웃 안해주면, 에러남!!
    setTimeout(function() {
      $state.go('tab.map');
      $scope.$emit('map.changeCenter.request', lonLat);
    }, 100);
  };

	places.loadSavedPlace('top');
}]);
