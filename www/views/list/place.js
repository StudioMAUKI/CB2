'use strict';

angular.module('CB2.controllers')
.controller('placeCtrl', ['$scope', '$stateParams', '$state', '$ionicHistory', '$ionicPopup', '$ionicModal', '$ionicSlideBoxDelegate', '$ionicActionSheet', '$ionicScrollDelegate', '$ionicLoading', '$q', '$cordovaClipboard', '$ionicListDelegate', 'RemoteAPIService', 'PostHelper', 'PhotoService', 'ogParserService', 'daumSearchService', 'DOMHelper', 'PKAuthStorageService', function($scope, $stateParams, $state, $ionicHistory, $ionicPopup, $ionicModal, $ionicSlideBoxDelegate, $ionicActionSheet, $ionicScrollDelegate, $ionicLoading, $q, $cordovaClipboard, $ionicListDelegate, RemoteAPIService, PostHelper, PhotoService, ogParserService, daumSearchService, DOMHelper, PKAuthStorageService) {
  var place = this
  place.uplace_uuid = $stateParams.uplace_uuid;
  place.postHelper = PostHelper;
  place.zoomMin = 1;
  place.imagesForSlide = [];
  place.imageHeight = 0;
  place.tag = '';
  place.coverImage = 'img/default.jpg';
  place.URLs = [];
  place.searchResults = [];
  place.tagsForUpdate = [];
  place.starPoint = 5;
  place.starPointIcons = ['ion-ios-star', 'ion-ios-star', 'ion-ios-star-half', 'ion-ios-star-outline', 'ion-ios-star-outline'];
  place.visited = false;
  place.calculatedHeight = DOMHelper.getImageHeight('user-image', 3, 5);
  place.buttonColor = ['stable', 'positive', 'calm', 'balanced', 'energized', 'assertive', 'royal', 'dark'];

  $scope.$on('$ionicView.afterEnter', function() {
		place.loadPlaceInfo();
	});

  $scope.$on('$ionicView.beforeLeave', function() {
		place.updateTags();
	});

  place.getTagColor = function() {
    var random = Math.random();
    console.log('random value: ' + random);
    return 'button-' + place.buttonColor[Math.floor(random*1000)%place.buttonColor.length];
  }

  place.visit = function() {
    place.visited = !place.visited;
    RemoteAPIService.sendUserPost({
      visit: {
        content: place.visited
      },
      uplace_uuid: place.uplace_uuid
    })
    .then(function(result) {

    }, function(err) {
      console.error('Set visiting status to the place is failed.');
      $ionicPopup.alert({
        title: 'ERROR: Marking visited',
        template: JSON.stringify(err)
      });
    });
  };

  place.loadPlaceInfo = function() {
    RemoteAPIService.getPost(place.uplace_uuid)
    .then(function(post) {
      console.dir(post);
      place.post = post;
      if (place.post.userPost.images) {
        place.imagesForSlide = [];
        for (var i = 0; i < place.post.userPost.images.length; i++) {
          place.imagesForSlide.push(place.post.userPost.images[i].content);
        }
        place.coverImage = place.post.userPost.images[0].summary;
        // $scope.$apply();
      }

      place.URLs = [];
      if (place.post.userPost.urls) {
        for (var i = 0; i < place.post.userPost.urls.length; i++) {
          ogParserService.getOGInfo(place.post.userPost.urls[i].content)
          .then(function(ogInfo) {
            place.URLs.push(ogInfo);
          }, function(err) {
            console.error(err);
          });
        }
      }

      for (var i = 0; i < place.post.userPost.tags.length; i++) {
        place.post.userPost.tags[i].color = place.getTagColor();
      }

      place.getDaumResult();
      place.tagsForUpdate = [];
      place.starPoint = post.userPost.rating ? post.userPost.rating.content : 0;
      place.changeStarPoint();

      place.visited = post.userPost.visit? post.userPost.visit.content : false;
    }, function(err) {
      $ionicPopup.alert({
        title: '죄송합니다!',
        template: '해당하는 장소 정보를 불러올 수 없습니다.'
      })
      .then(function() {
        place.goBack();
      });
    });
  };

  place.deletePlace = function() {
    $ionicPopup.confirm({
			title: '장소 삭제',
			template: '정말로 저장한 장소를 지우시겠습니까?'
		})
		.then(function(res){
			if (res) {
        RemoteAPIService.deleteUserPost(place.uplace_uuid)
        .then(function() {
          $ionicPopup.alert({
            title: '성공',
            template: '삭제되었습니다'
          })
          .then(function() {
            place.goBack();
          });
        }, function(err) {
          console.error(err);
        });
      }
		});
  };

  place.deleteImage = function(index) {
    $ionicPopup.confirm({
			title: '사진 삭제',
			template: '선택한 사진을 지우시겠습니까?'
		})
		.then(function(res){
			if (res) {
        console.log('Delete image : ' + index);
        RemoteAPIService.deleteContentInUserPost({
          uplace_uuid: place.uplace_uuid,
          images:[{
            content: place.post.userPost.images[index].content
          }]
        })
        .then(function(result) {
          place.post.userPost.images.splice(index, 1);
          place.imagesForSlide.splice(index, 1);
        }, function(err) {
          console.error('Deleting note failed.');
          console.dir(err);
        })
        .finally(function() {
          $ionicListDelegate.closeOptionButtons();
        });
      }
    });
  };

  place.goBack = function() {
    console.log('Move Back');
    var history = $ionicHistory.viewHistory();
    // console.dir(history);
    if (history.backView === null || history.backView.stateName === 'tab.map') {
      $state.go('tab.list');
    } else {
      $ionicHistory.goBack();
    }
    // console.dir(history);
    //$ionicHistory.goBack();
  };

  place.showImagesWithFullScreen = function(index) {
    place.activeSlide = index;
    place.showModal('views/list/image-zoomview.html');
  };

  place.showModal = function(templateURL) {
    $ionicModal.fromTemplateUrl(templateURL, {
      scope: $scope
    }).then(function(modal) {
      place.modal = modal;
      place.modal.show();
    });
  };

  place.closeModal = function() {
    place.modal.hide();
    place.modal.remove();
    // console.dir(place.tagsForUpdate);
  };

  place.updateSlideStatus = function(slide) {
    var zoomFactor = $ionicScrollDelegate.$getByHandle('scrollHandle' + slide).getScrollPosition().zoom;
    if (zoomFactor == place.zoomMin) {
      $ionicSlideBoxDelegate.enableSlide(true);
    } else {
      $ionicSlideBoxDelegate.enableSlide(false);
    }
  };

  place.addNote = function() {
    $scope.place.newNote = '';
    var myPopup = $ionicPopup.show({
      template: '<input type="text" ng-model="place.newNote">',
      title: '댓글을 입력하세요',
      scope: $scope,
      buttons: [
        { text: 'Cancel' },
        {
          text: '<b>확인</b>',
          type: 'pk-accent',
          onTap: function(e) {
            if (!$scope.place.newNote) {
              e.preventDefault();
            } else {
              return $scope.place.newNote;
            }
          }
        }
      ]
    });

    myPopup.then(function(note) {
      console.log('Tapped!', note);
      if (note !== undefined) {
        RemoteAPIService.sendUserPost({
          notes: [{
            content: note
          }],
          uplace_uuid: place.uplace_uuid
        })
        .then(function(result) {
          if (place.post.userPost.notes === undefined || place.post.userPost.notes === null || place.post.userPost.notes.length === 0) {
            place.post.userPost.notes = [{
              content: note,
              timestamp: Date.now()
            }];
          } else {
            place.post.userPost.notes.splice(0, 0, {
              content: note,
              timestamp: Date.now()
            });
          }
        }, function(err) {
          console.error('Adding URL to the post is failed.');
          $ionicPopup.alert({
            title: 'ERROR: Add URL',
            template: JSON.stringify(err)
          });
        });
      }
    });
  };

  place.deleteNote = function(index) {
    console.log('note index : ' + index);
    $ionicPopup.confirm({
			title: '댓글 삭제',
			template: '선택한 댓글을 지우시겠습니까?'
		})
		.then(function(res){
			if (res) {
        RemoteAPIService.deleteContentInUserPost({
          uplace_uuid: place.uplace_uuid,
          notes:[{
            content: place.post.userPost.notes[index].content
          }]
        })
        .then(function(result) {
          place.post.userPost.notes.splice(index, 1);
        }, function(err) {
          console.error('Deleting note failed.');
          console.dir(err);
        })
        .finally(function() {
          $ionicListDelegate.closeOptionButtons();
        });
      }
    })
    .finally(function() {
      $ionicListDelegate.closeOptionButtons();
    });
  };

  place.updateTags = function() {
    if (place.tagsForUpdate.length > 0) {
      RemoteAPIService.sendUserPost({
        notes: [{
          content: '[NOTE_TAGS]#' + JSON.stringify(place.tagsForUpdate)
        }],
        uplace_uuid: place.uplace_uuid
      })
      .then(function(result){
        place.tagsForUpdate = [];
      }, function(err) {
        console.error('Updating tags is failed.');
        console.dir(err);
      });
    }
  };

  place.addURL= function() {
    // An elaborate, custom popup
    var myPopup = $ionicPopup.show({
      template: '<input type="text" ng-model="place.URL">',
      title: '추가할 URL을 입력하세요',
      subTitle: '붙여넣기를 하시면 편리합니다.',
      scope: $scope,
      buttons: [
        { text: 'Cancel' },
        {
          text: '<b>확인</b>',
          type: 'pk-accent',
          onTap: function(e) {
            if (!$scope.place.URL) {
              e.preventDefault();
            } else {
              return $scope.place.URL;
            }
          }
        }
      ]
    });
    if (ionic.Platform.isIOS() || ionic.Platform.isAndroid()) {
      $cordovaClipboard.paste()
      .then(function(result) {
        console.log('URL in clipboard: ' + result);
        var pastedURL = result;
        if (pastedURL !== '') {
          place.URL = pastedURL;
        }
      }, function(err) {
        console.error('Clipboard paste error : ' + error);
      });
    }

    myPopup.then(function(URL) {
      console.log('Tapped!', URL);
      if (URL !== undefined) {
        RemoteAPIService.sendUserPost({
          urls: [{
            content: URL
          }],
          uplace_uuid: place.uplace_uuid
        })
        .then(function(result) {
          console.log('Adding URL to the post is successed.');
          $ionicPopup.alert({
            title: 'SUCCESS',
            template: 'URL이 추가되었습니다.'
          })
          .then(function(result){
            // place.loadPlaceInfo();
            ogParserService.getOGInfo(URL)
            .then(function(ogInfo) {
              place.URLs.splice(0, 0, ogInfo);
            }, function(err) {
              console.error(err);
            });
          });
        }, function(err) {
          console.error('Adding URL to the post is failed.');
          $ionicPopup.alert({
            title: 'ERROR: Add URL',
            template: JSON.stringify(err)
          });
        });
      }
    });
  };

  place.deleteURL = function(index) {
    console.log('URL index : ' + index);
    $ionicPopup.confirm({
			title: '웹문서 삭제',
			template: '선택한 웹문서를 지우시겠습니까?'
		})
		.then(function(res){
			if (res) {
        RemoteAPIService.deleteContentInUserPost({
          uplace_uuid: place.uplace_uuid,
          urls:[{
            content: place.post.userPost.urls[index].content
          }]
        })
        .then(function(result) {
          place.post.userPost.urls.splice(index, 1);
          place.URLs.splice(index, 1);
        }, function(err) {
          console.error('Deleting URL failed.');
          console.dir(err);
        })
        .finally(function() {
          $ionicListDelegate.closeOptionButtons();
        });
      }
    })
    .finally(function() {
      $ionicListDelegate.closeOptionButtons();
    });
  };

  place.copyURL = function() {
    if (place.post.shorten_url === null) {
      // shoten url을 얻어서 복사
      RemoteAPIService.getShortenURL(place.post.uplace_uuid)
      .then(function(url) {
        place.copyURLToClipboard(url);
      }, function(err) {
        $ionicPopup.alert({
          title: '실패',
          template: '단축 URL을 얻어오지 못했습니다.'
        });
      })
    } else {
      place.copyURLToClipboard(place.post.shorten_url);
    }
  };

  place.copyURLToClipboard = function(url) {
    var emailID = PKAuthStorageService.get('email').split('@')[0];
    var msgAndUrl = emailID + '님이 [' + place.post.name + ']의 사진과 장소를 공유했습니다. ' + url;
    console.info(msgAndUrl);
    if (ionic.Platform.isIOS() || ionic.Platform.isAndroid()) {
      $cordovaClipboard.copy(msgAndUrl)
      .then(function(result) {
        console.log('Copying URL was successed.', url);
        $ionicPopup.alert({
          title: '성공',
          template: '이 페이지의 URL이 클립보드에 복사되었습니다.'
        });
      }, function(err) {
        console.error('Copying URL was failed.', error);
        $ionicPopup.alert({
          title: '실패',
          template: '오류가 발생하여 클립보드 복사에 실패했습니다.'
        });
      });
    }
  }

  place.addPhoto = function() {
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
          PhotoService.getPhotoWithCamera()
      		.then(function(imageURI) {
            $ionicLoading.show({
        			template: '<ion-spinner icon="lines">저장 중..</ion-spinner>',
        			duration: 60000
        		});
            RemoteAPIService.uploadImage(imageURI)
        		.then(function(response) {
        			console.log('Image UUID: ' + response.uuid);
      				RemoteAPIService.sendUserPost({
      					images: [{
      						content: response.url
      					}],
      					uplace_uuid: place.uplace_uuid
      				})
      				.then(function(result) {
                $ionicLoading.hide();
                // place.loadPlaceInfo();
                if (place.post.userPost.images === undefined || place.post.userPost.images === null || place.post.userPost.images.length === 0) {
                  place.post.userPost.images = [result.data.userPost.images[0]];
                  place.imagesForSlide = [result.data.userPost.images[0].content];
                  place.coverImage = result.data.userPost.images[0].summary;
                } else {
                  place.post.userPost.images.splice(0, 0, result.data.userPost.images[0]);
                  place.imagesForSlide.splice(0, 0, result.data.userPost.images[0].content);
                }
      				}, function(err) {
                $ionicLoading.hide();
      					$ionicPopup.alert({
      		        title: 'ERROR: Send user post',
      		        template: JSON.stringify(err)
      		      });
      				});
        		}, function(err) {
              $ionicLoading.hide();
        			$ionicPopup.alert({
                title: 'ERROR: Upload Image',
                template: JSON.stringify(err)
              });
        		});
      		});
        } else {
          PhotoService.getPhotoWithPhotoLibrary(5)
      		.then(function(imageURIs) {
            // console.dir(imageURIs);
            for (var i = 0; i < imageURIs.length; i++){
              $ionicLoading.show({
          			template: '<ion-spinner icon="lines">저장 중..</ion-spinner>',
          			duration: 60000
          		});
              RemoteAPIService.uploadImage(imageURIs[i])
          		.then(function(response) {
          			console.log('Image UUID: ' + response.uuid);
        				RemoteAPIService.sendUserPost({
        					images: [{
        						content: response.url
        					}],
        					uplace_uuid: place.uplace_uuid
        				})
        				.then(function(result) {
                  // place.loadPlaceInfo();
                  $ionicLoading.hide();
                  if (place.post.userPost.images === undefined || place.post.userPost.images === null || place.post.userPost.images.length === 0) {
                    place.post.userPost.images = [result.data.userPost.images[0]];
                    place.imagesForSlide = [result.data.userPost.images[0].content];
                    place.coverImage = result.data.userPost.images[0].summary;
                  } else {
                    place.post.userPost.images.splice(0, 0, result.data.userPost.images[0]);
                    place.imagesForSlide.splice(0, 0, result.data.userPost.images[0].content);
                  }
        				}, function(err) {
                  $ionicLoading.hide();
        					$ionicPopup.alert({
        		        title: 'ERROR: Send user post',
        		        template: JSON.stringify(err)
        		      });
        				});
          		}, function(err) {
                $ionicLoading.hide();
          			$ionicPopup.alert({
                  title: 'ERROR: Upload Image',
                  template: JSON.stringify(err)
                });
          		});
            }
      		});
        }

        return true;
      }
    });
  };

  place.openLink = function(url) {
    console.info('url: ' + url);
    window.open(url, '_system');
  };

  place.makeKeyword = function() {
    var keyword = '';
    if (place.post.placePost) {
      var region = place.post.placePost.addr2 || place.post.placePost.addr1 || place.post.placePost.addr3 || null;
      if (region) {
        var region_items = region.content.split(' ');
        var loopCount = region_items.length >= 4 ? 4 : region_items.length;
        for (var i = 1; i < loopCount; i++) {
          keyword += region_items[i] + '+';
        }
      }

      keyword += (place.post.placePost.name.content || place.post.userPost.name.content);
      console.log('Calculated keyword : ', keyword);
      keyword = encodeURI(keyword);
      console.log('URL encoded keyword : ', keyword);
    }
    return keyword;
  };

  place.getDaumResult = function() {
    var keyword = place.makeKeyword();
    if (keyword !== '') {
      daumSearchService.search(keyword)
      .then(function(items) {
        place.searchResults = items;
        for (var i = 0; i < place.searchResults.length; i++) {
          place.searchResults[i].title = place.searchResults[i].title.replace(/<b>/g, '').replace(/&lt;b&gt;/g, '').replace(/&lt;\/b&gt;/g, '').replace(/&quot;/g, '"');
          place.searchResults[i].description = place.searchResults[i].description.replace(/<b>/g, '').replace(/&lt;b&gt;/g, '').replace(/&lt;\/b&gt;/g, '').replace(/&quot;/g, '"');
        }
        // console.dir(place.searchResults);

      }, function(err) {
        place.searchResults = [];
        place.searchResults.push({
          author: 'MAUKI studio',
          comment: '',
          description: JSON.stringify(err),
          link: '',
          title: '검색 결과를 얻어 오는데 실패했습니다'
        })
      });
    }
  };

  place.searchPlace = function() {
    window.open('https://m.search.naver.com/search.naver?sm=mtb_hty.top&where=m_blog&query=' + place.makeKeyword(), '_system');
  };

  place.processTags = function($event) {
    // console.dir($event);
    var space = 32;
    var enter = 13;
    var comma = 188;
    if ($event.keyCode === space || $event.keyCode === enter || $event.keyCode === comma) {
      if (place.tag.length > 0) {
        place.post.userPost.tags.push({content:place.tag, color:place.getTagColor()});
        place.tagsForUpdate.push(place.tag);
      } else {
        console.warn('입력 받은 태그의 길이가 0임.');
      }
      place.tag = '';
    }
  };

  place.deleteTag = function(index) {
    $ionicPopup.confirm({
			title: '태그 삭제',
			template: '#' + place.post.userPost.tags[index].content + ' 태그를 지우시겠습니까?'
		})
		.then(function(res){
			if (res) {
        place.tagsForUpdate.push('-' + place.post.userPost.tags[index].content);
        place.post.userPost.tags.splice(index, 1);
      }
    });
  }

  place.setStarPoint = function() {
    console.log('setStarPoint');
    place.showModal('places/star-point-modal.html');
  };

  place.showTagCloud = function() {
    console.log('showTagCloud');
    place.showModal('places/tag-cloud-modal.html');
  }

  place.onTapStarPoint = function(event) {
    // if(ionic.Platform.isIOS()) {
    //   place.starPoint = (event.target.max / event.target.offsetWidth)*(event.gesture.touches[0].screenX - event.target.offsetLeft);
    //   console.log('starPoint : ' + place.starPoint);
    // }
    place.changeStarPoint();
  };

  place.confirmStarPoint = function() {
    // console.log('uplace_uuid: ' + place.uplace_uuid);
    RemoteAPIService.sendUserPost({
      rating: {
        content: place.starPoint
      },
      uplace_uuid: place.uplace_uuid
    })
    .then(function(result) {
      // console.dir(result);
      if (place.visited === false) {
        place.visit();
      }
    }, function(err) {
      console.error('Setting star point to the post is failed.');
      $ionicPopup.alert({
        title: 'ERROR: 별점 평가',
        template: JSON.stringify(err)
      });
    })
    .finally(function() {
      place.closeModal();
    });
  };

  place.changeStarPoint = function() {
    // console.log(place.starPoint);
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

    place.starPointIcons = starPointArray[place.starPoint];
  };

  place.goToMap = function(lonLat) {
    console.log('goToMap : ' + JSON.stringify(lonLat));
    //  이거 타임아웃 안해주면, 에러남!!
    setTimeout(function() {
      $state.go('tab.map');
      $scope.$emit('map.changeCenter.request', lonLat);
    }, 100);
  };

  $ionicSlideBoxDelegate.update();
  place.onUserDetailContentScroll = function(){
    var scrollDelegate = $ionicScrollDelegate.$getByHandle('userDetailContent');
    var scrollView = scrollDelegate.getScrollView();
    $scope.$broadcast('userDetailContent.scroll', scrollView);
  };
}])
.directive('headerShrink', function($document) {
  return {
    restrict: 'A',
    link: function($scope, $element, $attr) {
      var resizeFactor, scrollFactor, blurFactor;
      var header = $document[0].body.querySelector('.about-header');
      $scope.$on('userDetailContent.scroll', function(event,scrollView) {
        if (scrollView.__scrollTop >= 0) {
          scrollFactor = scrollView.__scrollTop/3.5;
          header.style[ionic.CSS.TRANSFORM] = 'translate3d(0, +' + scrollFactor + 'px, 0)';
        } else if (scrollView.__scrollTop > -70) {
          resizeFactor = -scrollView.__scrollTop/100 + 0.99;
          // blurFactor = -scrollView.__scrollTop/50;
          header.style[ionic.CSS.TRANSFORM] = 'scale('+resizeFactor+','+resizeFactor+')';
          // header.style.webkitFilter = 'blur('+blurFactor+'px)';
        }
      });
    }
  }
});
