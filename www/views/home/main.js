'use strict';

angular.module('CB2.controllers')
.controller('mainCtrl', ['$scope', '$ionicHistory', '$ionicPopup', 'RemoteAPIService', 'PKAuthStorageService', function($scope, $ionicHistory, $ionicPopup, RemoteAPIService, PKAuthStorageService) {
  var main = this;

  //////////////////////////////////////////////////////////////////////////////
  //  Private Mehtods
  //////////////////////////////////////////////////////////////////////////////
  function showAlert(msg, title) {
    $ionicPopup.alert({
      title: title || '오류가 발생했습니다',
      template: msg
    })
    .then(function(res) {
      console.log('앱을 종료할려는데..');
			ionic.Platform.exitApp();
    });
  };

  function login() {
		// 유저 등록
    RemoteAPIService.registerUser()
    .then(function(result) {
      // 유저 로그인
      RemoteAPIService.loginUser(result)
      .then(function(result) {
        // VD 등록
        RemoteAPIService.registerVD()
        .then(function(result) {
          // VD 로그인
          RemoteAPIService.loginVD(result)
          .then(function(result) {
            console.info('login success.');
          }, function(err) {
            console.error('loginVD failed.', err);
            RemoteAPIService.logoutUser(4);
          });
        }, function(err) {
          console.error(err);
          resetUserInfo(3);
        });
      }, function(err) {
        console.error('loginUser failed', err);
				RemoteAPIService.logoutUser(2);
        showAlert(JSON.stringify(err), '사용자 로그인 오류');
      });
    }, function(err) {
      console.error('registerUser failed', err);
			RemoteAPIService.logoutUser(1);
			showAlert(JSON.stringify(err), '사용자 등록 오류');
    });
	};

  function showEmailPopup() {
    main.myPopup = $ionicPopup.show({
    template: '<input type="text" ng-model="main.email">',
    title: '사용자 등록 필요',
    subTitle: '사용하시는 이메일 주소를 입력해 주세요.',
    scope: $scope,
    buttons: [
      { text: 'Cancel' },
      {
        text: '<b>등록</b>',
        type: 'button-positive',
        onTap: function(e) {
          console.debug(e);
          if (!main.email) {
            //don't allow the user to close unless he enters wifi password
            e.preventDefault();
          } else {
            var emailRegExp = /^[-a-z0-9~!$%^&*_=+}{\'?]+(\.[-a-z0-9~!$%^&*_=+}{\'?]+)*@([a-z0-9_][-a-z0-9_]*(\.[-a-z0-9_]+)*\.(aero|arpa|biz|com|coop|edu|gov|info|int|mil|museum|name|net|org|pro|travel|mobi|[a-z][a-z])|([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}))(:[0-9]{1,5})?$/i;
            if (emailRegExp.test(main.email)) {
        			return main.email
        		}
            e.preventDefault();
          }
        }
      }
    ]});
  }

  //////////////////////////////////////////////////////////////////////////////
  //  Event Handlers
  //////////////////////////////////////////////////////////////////////////////
  $scope.$on('$ionicView.loaded', function() {
    if (RemoteAPIService.hasEmail()) {
      login();
    } else {
      console.error('You don\'t have email address.');
      showEmailPopup();

  	  main.myPopup.then(function(res) {
  	    console.log('Tapped!', res);
  			PKAuthStorageService.set('email', main.email);
        login();
  	  });
    }
	});

  $scope.$on('$ionicView.afterEnter', function() {
		$ionicHistory.clearHistory();
    console.info('The View History', $ionicHistory.viewHistory());
	});
}]);
