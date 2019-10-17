'use strict';
angular.module('bahmni.registration')
    .directive('transferOutAddressFields', function () {
        return {
            restrict: 'AE',
            templateUrl: 'views/transferOutAddressFields.html',
            controller: 'TransferOutAddressFieldsDirectiveController',
            scope: {
                address: '=',
                addressLevels: '=',
                fieldValidation: '=',
                patient: '=',
                strictAutocompleteFromLevel: '='
            }
        };
    })
    .controller('TransferOutAddressFieldsDirectiveController', ['$scope', 'addressHierarchyService', '$timeout', function ($scope, addressHierarchyService, $timeout) {
        $scope.addressFieldInvalid = false;
        var selectedAddressUuids = {};
        var selectedUserGeneratedIds = {};
        var selectedProvinceUuid = {};

        $scope.transferOutName = "";
        $scope.transferOutProvince = "";
        $scope.transferOutDistrict = "";
        $scope.$on('HFEvent', function (event, data) {
            $scope.isRequired = data;
        });
        var addressLevelsCloneInDescendingOrder = $scope.addressLevels.slice(0).reverse();
        var addressLevelUIOrderBasedOnConfig = $scope.addressLevels;
        $scope.addressLevelsChunks = Bahmni.Common.Util.ArrayUtil.chunk(addressLevelUIOrderBasedOnConfig, 2);
        var addressLevelsNamesInDescendingOrder = addressLevelsCloneInDescendingOrder.map(function (addressLevel) {
            return addressLevel.addressField;
        });

        var populateSelectedAddressUuids = function (levelIndex, parentUuid) {
            if ($scope.addressLevels.length === 0 || !$scope.addressLevels[levelIndex]) {
                return;
            }

            var fieldName = $scope.addressLevels[levelIndex].addressField;
            var addressValue = $scope.address[fieldName];
            if (addressValue) {
                addressHierarchyService.search(fieldName, addressValue, parentUuid).then(function (response) {
                    var address = response && response.data && response.data[0];
                    if (address) {
                        selectedAddressUuids[fieldName] = address.uuid;
                        selectedUserGeneratedIds[fieldName] = address.userGeneratedId;
                        populateSelectedAddressUuids(levelIndex + 1, address.uuid);
                    }
                });
            }
        };

        $scope.addressFieldSelected = function (fieldName) {
            $timeout(function () {
                if (fieldName === "address7" && ($scope.$parent.$parent.patient.TRANSFER_OUT_PROVINCE !== undefined)) {
                    $scope.transferOutProvince = $scope.$parent.$parent.patient.TRANSFER_OUT_PROVINCE;
                }
                if (fieldName === "address8" && ($scope.$parent.$parent.patient.TRANSFER_OUT_DISTRICT !== undefined)) {
                    $scope.transferOutDistrict = $scope.$parent.$parent.patient.TRANSFER_OUT_DISTRICT;
                }
                if (fieldName === "address10" && ($scope.$parent.$parent.patient.TRANSFER_OUT_NAME !== undefined)) {
                    $scope.transferOutName = $scope.$parent.$parent.patient.TRANSFER_OUT_NAME;
                }
            }, 200);
            return function (addressFieldItem) {
                selectedAddressUuids[fieldName] = addressFieldItem.addressField.uuid;
                if (fieldName === "address7") {
                    $scope.$parent.$parent.patient.TRANSFER_OUT_PROVINCE = addressFieldItem.value;
                    selectedProvinceUuid[fieldName] = addressFieldItem.addressField.uuid;
                }
                if (fieldName === "address8") {
                    $scope.$parent.$parent.patient.TRANSFER_OUT_DISTRICT = addressFieldItem.value;
                }
                if (fieldName === "address10") {
                    $scope.$parent.patient.TRANSFER_OUT_NAME = addressFieldItem.value;
                }
                var parentFields = addressLevelsNamesInDescendingOrder.slice(addressLevelsNamesInDescendingOrder.indexOf(fieldName) + 1);

                var parent = addressFieldItem.addressField.parent;
                parentFields.forEach(function (parentField) {
                    if (!parent) {
                        return;
                    }
                    if (parentField === "address8") {
                        $scope.$parent.$parent.patient.TRANSFER_OUT_DISTRICT = parent.name;
                        document.getElementById("address8_out").value = parent.name;
                        $scope.transferOutDistrict = parent.name;
                        parent = parent.parent;
                    }
                    if (parentField === "address7") {
                        $scope.$parent.$parent.patient.TRANSFER_OUT_PROVINCE = parent.name;
                        document.getElementById("address7_out").value = parent.name;
                        $scope.transferOutProvince = parent.name;
                        parent = parent.parent;
                    }
                });
                $scope.$apply();
            };
        };

        $scope.findParentField = function (fieldName) {
            var found = _.find($scope.addressLevels, {addressField: fieldName});
            var index = _.findIndex($scope.addressLevels, found);
            var parentFieldName;
            var topLevel = 0;
            if (index !== topLevel) {
                var parent = $scope.addressLevels[index - 1];
                parentFieldName = parent.addressField;
            }
            return parentFieldName;
        };

        $scope.isReadOnly = function (addressLevel) {
            if (!$scope.address) {
                return false;
            }
            if (!addressLevel.isStrictEntry) {
                return false;
            }
            var fieldName = addressLevel.addressField;
            var parentFieldName = $scope.findParentField(fieldName);
            var parentValue = $scope.address[parentFieldName];
            var parentValueInvalid = isParentValueInvalid(parentFieldName);
            if (!parentFieldName) {
                return false;
            }
            if (parentFieldName && !parentValue) {
                return true;
            }
            return parentFieldName && parentValue && parentValueInvalid;
        };

        var isParentValueInvalid = function (parentId) {
            return angular.element($("#" + parentId)).hasClass('illegalValue');
        };

        var parentUuid = function (field) {
            return selectedAddressUuids[$scope.findParentField(field)];
        };

        $scope.getAddressEntryList = function (field) {
            return function (searchAttrs) {
                return addressHierarchyService.search(field, searchAttrs.term, parentUuid(field));
            };
        };

        $scope.getAddressDataResults = addressHierarchyService.getAddressDataResults;

        $scope.removeSelection = function (event, fieldName) {
            if (event.keyCode === 8) {
                $timeout(function () {
                    if (fieldName === "address7") {
                        $scope.$parent.$parent.patient.TRANSFER_OUT_DISTRICT = "";
                        document.getElementById("address8_out").value = "";
                        $scope.transferOutDistrict = "";
                        $scope.$parent.$parent.patient.TRANSFER_OUT_NAME = "";
                        document.getElementById("address10_out").value = "";
                        $scope.transferOutName = "";
                    }

                    if (fieldName === "address8") {
                        selectedAddressUuids = {};
                        selectedAddressUuids.address7 = selectedProvinceUuid.address7;
                        $scope.$parent.$parent.patient.TRANSFER_OUT_NAME = "";
                        document.getElementById("address10_out").value = "";
                        $scope.transferOutName = "";
                    }
                }, 1000);
            }
        };

        $scope.removeAutoCompleteEntry = function (fieldName) {
            return function () {
                if (fieldName === "address7") {
                    $scope.$parent.$parent.patient.TRANSFER_OUT_DISTRICT = "";
                    $scope.transferOutDistrict = "";

                    $scope.$parent.$parent.patient.TRANSFER_OUT_NAME = "";
                    $scope.transferOutName = "";
                }

                if (fieldName === "address8") {
                    $scope.$parent.$parent.patient.TRANSFER_OUT_NAME = "";
                    $scope.transferOutName = "";
                }
                $scope.selectedValue[fieldName] = null;
            };
        };

        var init = function () {
            // wait for address to be resolved in edit patient scenario
            var deregisterAddressWatch = $scope.$watch('address', function (newValue) {
                if (newValue !== undefined) {
                    populateSelectedAddressUuids(0);
                    $scope.selectedValue = _.mapValues($scope.address, function (value, key) {
                        var addressLevel = _.find($scope.addressLevels, {addressField: key});
                        return addressLevel && addressLevel.isStrictEntry ? value : null;
                    });
                    deregisterAddressWatch();
                }
            });

            var deregisterAddressWatchForPatientState = $scope.$watch('patient', function (newValue) {
                if (newValue !== undefined) {
                    if (newValue == "INACTIVE_SUSPENDED" || newValue === "INACTIVE_TRANSFERRED_OUT" || newValue === "INACTIVE_DEATH") {
                        $scope.isAddressDisabled = true;
                    } else {
                        $scope.isAddressDisabled = false;
                    }
                    deregisterAddressWatchForPatientState();
                }
            });
        };
        init();
    }]);
