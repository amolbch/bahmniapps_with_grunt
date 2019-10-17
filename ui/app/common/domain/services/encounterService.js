'use strict';

angular.module('bahmni.common.domain')
    .service('encounterService', ['$http', '$q', '$rootScope', '$window', 'configurations', '$bahmniCookieStore',
        function ($http, $q, $rootScope, $window, configurations, $bahmniCookieStore) {
            this.buildEncounter = function (encounter) {
                encounter.observations = encounter.observations || [];
                encounter.observations.forEach(function (obs) {
                    stripExtraConceptInfo(obs);
                });
                encounter.locale = $window.localStorage["NG_TRANSLATE_LANG_KEY"] || "en";
                encounter.providers = encounter.providers || [];

                var providerData = $bahmniCookieStore.get(Bahmni.Common.Constants.grantProviderAccessDataCookieName);
                if (_.isEmpty(encounter.providers)) {
                    if (providerData && providerData.uuid) {
                        encounter.providers.push({"uuid": providerData.uuid});
                    } else if ($rootScope.currentProvider && $rootScope.currentProvider.uuid) {
                        encounter.providers.push({"uuid": $rootScope.currentProvider.uuid});
                    }
                }

                if (encounter.observations[0] !== null && encounter.observations[0] !== undefined && encounter.observations[0].groupMembers !== undefined) {
                    if (encounter.observations[0].groupMembers[0] !== undefined && encounter.observations[0].groupMembers[0].groupMembers !== undefined) {
                        var observations = encounter.observations[0].groupMembers[0].groupMembers;
                        var containsWeight = false;
                        var containsHeight = false;

                        for (var h = 0; h < observations.length; h++) {
                            if (observations[h].concept.name === "HEIGHT") {
                                containsWeight = true;
                            }
                            if (observations[h].concept.name === "HEIGHT") {
                                containsHeight = true;
                            }
                        }

                        var containsBoth = containsHeight && containsHeight;

                        var missingValue = false;
                        for (var i = 0; i < observations.length; i++) {
                            if (observations[i].value === undefined || observations[i].value === null) {
                                if (observations[i].concept.name === "HEIGHT" || observations[i].concept.name === "WEIGHT") {
                                    missingValue = true;
                                }
                            }
                        }
                        if (missingValue === true || !containsBoth) {
                            for (var j = 0; j < observations.length; j++) {
                                if (observations[j].concept.name === "HEIGHT" || observations[j].concept.name === "WEIGHT") {
                                    observations.splice(j, 1);
                                    j--;
                                }
                            }
                        }
                        encounter.observations[0].groupMembers[0].groupMembers = observations;
                    }
                }
                return encounter;
            };

            var getDefaultEncounterType = function () {
                var url = Bahmni.Common.Constants.encounterTypeUrl;
                return $http.get(url + '/' + configurations.defaultEncounterType()).then(function (response) {
                    return response.data;
                });
            };

            var getEncounterTypeBasedOnLoginLocation = function (loginLocationUuid) {
                return $http.get(Bahmni.Common.Constants.entityMappingUrl, {
                    params: {
                        entityUuid: loginLocationUuid,
                        mappingType: 'location_encountertype',
                        s: 'byEntityAndMappingType'
                    },
                    withCredentials: true
                });
            };

            var getEncounterTypeBasedOnProgramUuid = function (programUuid) {
                return $http.get(Bahmni.Common.Constants.entityMappingUrl, {
                    params: {
                        entityUuid: programUuid,
                        mappingType: 'program_encountertype',
                        s: 'byEntityAndMappingType'
                    },
                    withCredentials: true
                });
            };

            var getDefaultEncounterTypeIfMappingNotFound = function (entityMappings) {
                var encounterType = entityMappings.data.results[0] && entityMappings.data.results[0].mappings[0];
                if (!encounterType) {
                    encounterType = getDefaultEncounterType();
                }
                return encounterType;
            };

            this.getEncounterType = function (programUuid, loginLocationUuid) {
                if (programUuid) {
                    return getEncounterTypeBasedOnProgramUuid(programUuid).then(function (response) {
                        return getDefaultEncounterTypeIfMappingNotFound(response);
                    });
                } else if (loginLocationUuid) {
                    return getEncounterTypeBasedOnLoginLocation(loginLocationUuid).then(function (response) {
                        return getDefaultEncounterTypeIfMappingNotFound(response);
                    });
                } else {
                    return getDefaultEncounterType();
                }
            };

            this.create = function (encounter) {
                encounter = this.buildEncounter(encounter);
                return $http.post(Bahmni.Common.Constants.bahmniEncounterUrl, encounter, {
                    withCredentials: true
                });
            };

            this.delete = function (encounterUuid, reason) {
                return $http.delete(Bahmni.Common.Constants.bahmniEncounterUrl + "/" + encounterUuid, {
                    params: {reason: reason}
                });
            };

            function isObsConceptClassVideoOrImage (obs) {
                return (obs.concept.conceptClass === 'Video' || obs.concept.conceptClass === 'Image');
            }

            var deleteIfImageOrVideoObsIsVoided = function (obs) {
                if (obs.voided && obs.groupMembers && !obs.groupMembers.length && obs.value
                    && isObsConceptClassVideoOrImage(obs)) {
                    var url = Bahmni.Common.Constants.RESTWS_V1 + "/bahmnicore/visitDocument?filename=" + obs.value;
                    $http.delete(url, {withCredentials: true});
                }
            };

            var stripExtraConceptInfo = function (obs) {
                deleteIfImageOrVideoObsIsVoided(obs);
                obs.concept = {uuid: obs.concept.uuid, name: obs.concept.name, dataType: obs.concept.dataType};
                obs.groupMembers = obs.groupMembers || [];
                obs.groupMembers.forEach(function (groupMember) {
                    stripExtraConceptInfo(groupMember);
                });
            };

            var searchWithoutEncounterDate = function (visitUuid) {
                return $http.post(Bahmni.Common.Constants.bahmniEncounterUrl + '/find', {
                    visitUuids: [visitUuid],
                    includeAll: Bahmni.Common.Constants.includeAllObservations
                }, {
                    withCredentials: true
                });
            };

            this.search = function (visitUuid, encounterDate) {
                if (!encounterDate) {
                    return searchWithoutEncounterDate(visitUuid);
                }

                return $http.get(Bahmni.Common.Constants.emrEncounterUrl, {
                    params: {
                        visitUuid: visitUuid,
                        encounterDate: encounterDate,
                        includeAll: Bahmni.Common.Constants.includeAllObservations
                    },
                    withCredentials: true
                });
            };

            this.find = function (params) {
                return $http.post(Bahmni.Common.Constants.bahmniEncounterUrl + '/find', params, {
                    withCredentials: true
                });
            };
            this.findByEncounterUuid = function (encounterUuid) {
                return $http.get(Bahmni.Common.Constants.bahmniEncounterUrl + '/' + encounterUuid, {
                    params: {includeAll: true},
                    withCredentials: true
                });
            };

            this.getEncountersForEncounterType = function (patientUuid, encounterTypeUuid) {
                return $http.get(Bahmni.Common.Constants.encounterUrl, {
                    params: {
                        patient: patientUuid,
                        encounterType: encounterTypeUuid,
                        v: "custom:(uuid,provider,visit:(uuid,startDatetime,stopDatetime),obs:(uuid,concept:(uuid,name),groupMembers:(id,uuid,obsDatetime,value,comment)))"
                    },
                    withCredentials: true
                });
            };

            this.getDigitized = function (patientUuid) {
                var patientDocumentEncounterTypeUuid = configurations.encounterConfig().getPatientDocumentEncounterTypeUuid();
                return $http.get(Bahmni.Common.Constants.encounterUrl, {
                    params: {
                        patient: patientUuid,
                        encounterType: patientDocumentEncounterTypeUuid,
                        v: "custom:(uuid,obs:(uuid))"
                    },
                    withCredentials: true
                });
            };

            this.discharge = function (encounterData) {
                var encounter = this.buildEncounter(encounterData);
                return $http.post(Bahmni.Common.Constants.dischargeUrl, encounter, {
                    withCredentials: true
                });
            };
        }]);
