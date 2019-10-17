'use strict';

angular.module('bahmni.registration')
    .directive('onlyLettersInput', function () {
        return {
            require: 'ngModel',
            scope: {
                regex: '@onlyLettersInput',
                with: '@with'
            },
            link: function (scope, element, attrs, model) {
                model.$parsers.push(function (val) {
                    if (!val) {
                        return false;
                    }
                    var regex = new RegExp(scope.regex);
                    var replaced = val.replace(regex, scope.with);
                    if (replaced !== val) {
                        model.$setViewValue(replaced);
                        model.$render();
                    }
                    return replaced;
                });
            }
        };
    });
