'use strict';

angular.module('bahmni.common.domain')
    .factory('providerTypeService', ['$http', 'providerService', function ($http, providerService) {
        var getProviderType = function (providerAttributes) {
            var providerTypes = _.map(providerAttributes, function (obj) {
                if (obj.attributeType.display == 'APSS') {
                    if (obj.value === true && obj.voided === false) {
                        return obj.attributeType.display;
                    }
                } else if (obj.attributeType.display == 'Clinical') {
                    if (obj.value === true && obj.voided === false) {
                        return obj.attributeType.display;
                    }
                }
            });
            return _.filter(providerTypes, function (type) {
                return type != undefined;
            });
        };

        var getAllProviders = function () {
            var params = {v: "custom:(display,person,uuid,retired,attributes:(attributeType:(display),value,voided))"};
            return providerService.list(params).then(function (response) {
                return _.filter(response.data.results);
            });
        };

        return {
            getProviderType: getProviderType,
            getAllProviders: getAllProviders

        };
    }]);
