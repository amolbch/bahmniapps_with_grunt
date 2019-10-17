'use strict';

angular.module('bahmni.common.domain')
    .service('allergiesService', ['$http', function ($http) {
        this.save = function (allergies, patientUuid) {
            var body = _.map(allergies, function (allergy) {
                return {
                    uuid: allergy.uuid,
                    patientUuid: patientUuid,
                    concept: allergy.concept,
                    allergyNonCoded: allergy.allergyNonCoded,
                    status: allergy.status,
                    onSetDate: allergy.onSetDate,
                    endDate: allergy.endDate,
                    endReason: allergy.endReason,
                    additionalDetail: allergy.additionalDetail,
                    voided: allergy.voided,
                    voidReason: allergy.voidReason
                };
            });

            return $http.post(Bahmni.Common.Constants.allergyUrl, body, {
                withCredentials: true,
                headers: {"Accept": "application/json", "Content-Type": "application/json"}
            });
        };
        this.getAllergyHistory = function (patientUuid) {
            var params = {
                patientUuid: patientUuid
            };
            return $http.get(Bahmni.Common.Constants.allergyHistoryUrl, {
                params: params,
                headers: {
                    withCredentials: true
                }
            });
        };
        this.getFollowUpAllergyConcept = function () {
            return $http.get(Bahmni.Common.Constants.conceptSearchByFullNameUrl, {
                params: {
                    name: Bahmni.Common.Constants.followUpAllergyConcept,
                    v: "custom:(uuid,name:(name))"
                },
                cache: true
            });
        };
        var getLatestActiveAllergy = function (allergyHistories, latestAllergy) {
            var allergyHistory = _.find(allergyHistories, {
                conceptUuid: latestAllergy.concept.uuid,
                allergyNonCoded: latestAllergy.allergyNonCoded
            });
            return Bahmni.Common.Domain.Allergies.getPreviousActiveAllergy(latestAllergy, allergyHistory.allergies);
        };
        this.getAllergies = function (patientUuid) {
            return this.getAllergyHistory(patientUuid).then(function (response) {
                var allergyHistories = response.data;
                var allergies = Bahmni.Common.Domain.Allergies.fromAllergyHistories(allergyHistories);
                _.forEach(allergies, function (allergy) {
                    allergy.activeSince = getLatestActiveAllergy(allergyHistories, allergy).onSetDate;
                });
                return allergies;
            });
        };
    }]);
