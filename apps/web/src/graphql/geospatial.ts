import { gql } from '@apollo/client';

export const GET_REGIONS = gql`
  query Regions {
    regions
  }
`;

export const GET_DEPARTEMENTS = gql`
  query Departements($regionCode: String!) {
    departements(regionCode: $regionCode)
  }
`;

export const GET_COMMUNES = gql`
  query Communes($departementCode: String!) {
    communes(departementCode: $departementCode)
  }
`;

export const GET_LIEUX_DITS = gql`
  query LieuxDits($communeCode: String!) {
    lieuxDits(communeCode: $communeCode)
  }
`;

export const GET_FOREST_PLOTS = gql`
  query ForestPlots($filters: ForestPlotsFilterInput) {
    forestPlots(filters: $filters) {
      id
      codeRegion
      codeDepartement
      codeCommune
      lieuDit
      geometry
      essences
      surfaceHectares
      typeForet
    }
  }
`;