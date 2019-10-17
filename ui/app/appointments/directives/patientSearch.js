'use strict';

angular.module('bahmni.appointments')
    .directive('patientSearch', ['patientService', 'appointmentsService', 'spinner', '$state', '$q', function (patientService, appointmentsService, spinner, $state, $q) {
        return {
            restrict: "E",
            scope: {
                onSearch: "="
            },
            templateUrl: "../appointments/views/manage/patientSearch.html",
            link: {
                pre: function ($scope) {
                    $scope.search = function () {
                        return spinner.forPromise(patientService.search($scope.patient).then(function (response) {
                            return response.data.pageOfResults;
                        }));
                    };

                    $scope.responseMap = function (data) {
                        return _.map(data, function (patientInfo) {
                            patientInfo.label = patientInfo.givenName + " " + patientInfo.familyName + " " + "(" + patientInfo.identifier + ")";
                            return patientInfo;
                        });
                    };

                    $scope.onSelectPatient = function (data) {
                        $state.params.patient = data;
                        spinner.forPromise($q.all([appointmentsService.search({patientUuid: data.uuid}), patientService.getPatientStatusState(data.uuid)]).then(function (oldAppointments) {
                            var patientState = oldAppointments[1].data[0].patient_state;
                            if (patientState == 'INACTIVE_TRANSFERRED_OUT' || patientState == 'INACTIVE_SUSPENDED' || patientState == 'INACTIVE_DEATH') {
                                $scope.$emit("HideAppointmentButton", true);
                            } else {
                                $scope.$emit("HideAppointmentButton", false);
                            }
                            var appointmentInDESCOrderBasedOnStartDateTime = _.sortBy(oldAppointments[0].data, "startDateTime").reverse();
                            $scope.onSearch(appointmentInDESCOrderBasedOnStartDateTime);
                        }));
                    };

                    if ($state.params.isSearchEnabled && $state.params.patient) {
                        $scope.patient = $scope.responseMap([$state.params.patient])[0].label;
                        $scope.onSelectPatient($state.params.patient);
                    }

                    $scope.$watch(function () {
                        return $state.params.isSearchEnabled;
                    }, function (isSearchEnabled) {
                        if (isSearchEnabled == false) {
                            $scope.patient = null;
                        }
                    }, true);
                }
            }
        };
    }]);
