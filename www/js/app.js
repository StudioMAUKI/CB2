// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
angular.module('CB2', ['ionic', 'ngCordova', 'CB2.config', 'CB2.controllers', 'CB2.services'])

.run(function($ionicPlatform) {
  $ionicPlatform.ready(function() {
    if(window.cordova && window.cordova.plugins.Keyboard) {
      // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
      // for form inputs)
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);

      // Don't remove this line unless you know what you are doing. It stops the viewport
      // from snapping when text inputs are focused. Ionic handles this internally for
      // a much nicer keyboard experience.
      cordova.plugins.Keyboard.disableScroll(true);
    }
    if(window.StatusBar) {
      StatusBar.styleDefault();
    }
  });
})
// .directive('disableTap', function($timeout) {
//   return {
//     link: function() {
//       $timeout(function() {
//         // Find google places div
//         _.findIndex(angular.element(document.querySelectorAll('.pac-container')), function(container) {
//           // disable ionic data tab
//           container.setAttribute('data-tap-disabled', 'true');
//           // leave input field if google-address-entry is selected
//           container.onclick = function() {
//             document.getElementById('autocomplete').blur();
//           };
//         });
//       },500);
//     }
//   };
// })
.directive('disableTap', function($timeout) {
  return {
    link: function() {
      $timeout(function() {
        // document.querySelector('.pac-container').setAttribute('data-tap-disabled', 'true')
        var container = document.getElementsByClassName('pac-container');
        // disable ionic data tab
        angular.element(container).attr('data-tap-disabled', 'true');
        // leave input field if google-address-entry is selected
        angular.element(container).on("click", function(){
          document.getElementById('pac-input').blur();
          console.debug('clicked');
        });
      },500);
    }
  };
})
.directive('ngAutocomplete', function() {
  return {
    require: 'ngModel',
    scope: {
      ngModel: '=',
      options: '=?',
      details: '=?'
    },

    link: function(scope, element, attrs, controller) {

      //options for autocomplete
      var opts
      var watchEnter = false
      //convert options provided to opts
      var initOpts = function() {

        opts = {}
        if (scope.options) {

          if (scope.options.watchEnter !== true) {
            watchEnter = false
          } else {
            watchEnter = true
          }

          if (scope.options.types) {
            opts.types = []
            opts.types.push(scope.options.types)
            scope.gPlace.setTypes(opts.types)
          } else {
            scope.gPlace.setTypes([])
          }

          if (scope.options.bounds) {
            opts.bounds = scope.options.bounds
            scope.gPlace.setBounds(opts.bounds)
          } else {
            scope.gPlace.setBounds(null)
          }

          if (scope.options.country) {
            opts.componentRestrictions = {
              country: scope.options.country
            }
            scope.gPlace.setComponentRestrictions(opts.componentRestrictions)
          } else {
            scope.gPlace.setComponentRestrictions(null)
          }
        }
      }

      if (scope.gPlace == undefined) {
        scope.gPlace = new google.maps.places.Autocomplete(element[0], {});
      }
      google.maps.event.addListener(scope.gPlace, 'place_changed', function() {
        var result = scope.gPlace.getPlace();
        if (result !== undefined) {
          if (result.address_components !== undefined) {

            scope.$apply(function() {

              scope.details = result;

              controller.$setViewValue(element.val());
            });
          }
          else {
            if (watchEnter) {
              getPlace(result)
            }
          }
        }
      })

      //function to get retrieve the autocompletes first result using the AutocompleteService
      var getPlace = function(result) {
        var autocompleteService = new google.maps.places.AutocompleteService();
        if (result.name.length > 0){
          autocompleteService.getPlacePredictions(
            {
              input: result.name,
              offset: result.name.length
            },
            function listentoresult(list, status) {
              if(list == null || list.length == 0) {

                scope.$apply(function() {
                  scope.details = null;
                });

              } else {
                var placesService = new google.maps.places.PlacesService(element[0]);
                placesService.getDetails(
                  {'reference': list[0].reference},
                  function detailsresult(detailsResult, placesServiceStatus) {

                    if (placesServiceStatus == google.maps.GeocoderStatus.OK) {
                      scope.$apply(function() {

                        controller.$setViewValue(detailsResult.formatted_address);
                        element.val(detailsResult.formatted_address);

                        scope.details = detailsResult;

                        //on focusout the value reverts, need to set it again.
                        var watchFocusOut = element.on('focusout', function(event) {
                          element.val(detailsResult.formatted_address);
                          element.unbind('focusout')
                        })

                      });
                    }
                  }
                );
              }
            });
        }
      }

      controller.$render = function () {
        var location = controller.$viewValue;
        element.val(location);
      };

      //watch options provided to directive
      scope.watchOptions = function () {
        return scope.options
      };
      scope.$watch(scope.watchOptions, function () {
        initOpts()
      }, true);

    }



  };
});
