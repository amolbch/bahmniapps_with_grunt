'use strict';

angular.module('bahmni.common.uiHelper')
    .directive('splitButtonnew', ['$timeout', function ($timeout) {
        var controller = function ($scope) {
            $scope.primaryOption = $scope.primaryOption || $scope.options[0];
            $scope.secondaryOptions = _.without($scope.options, $scope.primaryOption);
            $scope.hasMultipleOptions = function () {
                return $scope.secondaryOptions.length > 0;
            };
        };

        var link = function (scope, element) {
            var shouldScroll = function (elementPosition, elementHeight) {
                var windowHeight = window.innerHeight + $(window).scrollTop();
                return windowHeight < (elementHeight + elementPosition);
            };

            scope.scrollToBottom = function () {
                var timeout = $timeout(function () {
                    var scrollHeight = $(element)[0].scrollHeight;
                    if (shouldScroll(element.position().top, scrollHeight)) {
                        window.scrollBy(0, scrollHeight);
                        $timeout.cancel(timeout);
                    }
                });
            };
        };
        return {
            restrict: 'A',
            template: '<div class="split-button" bm-pop-over>' +
                '<button bm-pop-over-trigger style="height:31px;width:40px" class="toggle-buttonNew fa fa-caret-down" ng-show="::hasMultipleOptions()" ng-click="scrollToBottom()" ng-disabled="optionDisabled" type="button style="color:"black"></button>' +
                '<ul class="options">' +
                '<li>' +
                '<button class="buttonClass" ng-click="optionClick()(primaryOption)" accesskey="{{::primaryOption.shortcutKey}}" ng-disabled="optionDisabled" ng-bind-html="::optionText()(primaryOption,\'primary\') | translate "></button>' +
                '</li>' +
                '<ul class="hidden-optionsNew">' +
                '<li bm-pop-over-target ng-repeat="option in ::secondaryOptions" class="secondaryOptionNew">' +
                '<button class="buttonClass" ng-click="optionClick()(option)" accesskey="{{::option.shortcutKey}}" ng-disabled="optionDisabled" ng-bind-html="::optionText()(option) | translate"></button>' +
                '</li>' +
                '</ul>' +
                '</ul>' +
                '</div>',
            controller: controller,
            link: link,
            scope: {
                options: '=',
                primaryOption: '=',
                optionText: '&',
                optionClick: '&',
                optionDisabled: '='
            }
        };
    }]);
