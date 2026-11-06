using {com.employee.management as db} from '../db/schema';

service EmployeeService @(
  path    : '/odata/v4/employee',
  requires: 'authenticated-user'
) {
  @restrict: [
    { grant: 'READ', to: 'Viewer' },
    { grant: '*',    to: 'Admin' }
  ]
  entity Employees   as projection on db.Employees;

  @restrict: [
    { grant: 'READ', to: 'Viewer' },
    { grant: '*',    to: 'Admin' }
  ]
  entity Departments as projection on db.Departments;
}
