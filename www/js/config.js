'use strict';

angular.module('CB2.config', [])
.config(function($ionicConfigProvider, $stateProvider, $urlRouterProvider, $httpProvider) {
	console.log('config called');
	// CSRF token 설정을 위함 (꼭 들어가야 함!!)
	$httpProvider.defaults.xsrfCookieName = 'csrftoken';
	$httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';
	$httpProvider.defaults.timeout = 5000;

	$ionicConfigProvider.tabs.position('bottom');

	$stateProvider
	.state('tab', {
    url: '',
    abstract: true,
    // controller: 'tabCtrl',
    templateUrl: 'views/tab.html'
  })
	.state('tab.home', {
    url: '/home',
    views: {
      'home': {
        templateUrl: 'views/home/main.html',
        controller: 'mainCtrl',
        controllerAs: 'main'
      }
    }
  })
	.state('tab.saveFirst', {
    url: '/save-first?mode',
    views: {
      'home': {
        templateUrl: 'views/home/save-first.html',
        controller: 'saveFirstCtrl',
        controllerAs: 'saveFirst'
      }
    }
  })
	.state('tab.saveSecond', {
    url: '/save-second',
    views: {
      'home': {
        templateUrl: 'views/home/save-second.html',
        controller: 'saveSecondCtrl',
        controllerAs: 'saveSecond'
      }
    }
  })
	.state('tab.setting', {
    url: '/setting',
    views: {
      'setting': {
        templateUrl: 'views/setting/main.html',
        controller: 'settingMainCtrl',
        controllerAs: 'settingMain'
      }
    }
  })
	.state('tab.list', {
    url: '/list?latitude&longitude&radius&rname&limit',
    views: {
      'list': {
        templateUrl: 'views/list/places.html',
        controller: 'placesCtrl',
        controllerAs: 'places'
      }
    }
  })
	.state('tab.place', {
    url: '/list/:uplace_uuid',
    views: {
      'list': {
        templateUrl: 'views/list/place.html',
        controller: 'placeCtrl',
        controllerAs: 'place'
      }
    }
  });

	$urlRouterProvider.otherwise('/home');
});
