namespace com.employee.management;

using {
  cuid,
  managed
} from '@sap/cds/common';

type EmployeeStatus : String(20) enum {
  Active;
  Inactive;
  Terminated;
}

entity Departments : cuid, managed {
  name        : String(100) @mandatory;
  description : String(500);
  employees   : Association to many Employees
                  on employees.department = $self;
}

@assert.unique: {
  employeeCode: [employeeCode],
  email       : [email]
}
entity Employees : cuid, managed {
  employeeCode : String(20)  @mandatory;
  firstName    : String(100) @mandatory;
  lastName     : String(100) @mandatory;
  email        : String(255) @mandatory  @assert.format: '^[^\s@]+@[^\s@]+\.[^\s@]+$';
  phone        : String(20);
  dateOfBirth  : Date;
  hireDate     : Date        @mandatory;
  designation  : String(100);
  salary       : Decimal(15, 2) @assert.range: [0, _];
  status       : EmployeeStatus default 'Active' @assert.range;
  department   : Association to Departments @assert.target;
  manager      : Association to Employees  @assert.target;
}
