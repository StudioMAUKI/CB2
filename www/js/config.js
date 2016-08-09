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
  });

	$urlRouterProvider.otherwise('/home');
});
