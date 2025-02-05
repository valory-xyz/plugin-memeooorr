export interface PackageQueryVariables {
  package_type: string;
}

export interface PackageQuery {
  query: string;
  variables: PackageQueryVariables;
}
