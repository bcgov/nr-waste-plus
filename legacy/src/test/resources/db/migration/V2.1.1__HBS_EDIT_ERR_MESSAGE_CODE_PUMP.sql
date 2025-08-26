-- Data pump for HBS_EDIT_ERR_MESSAGE_CODE
INSERT INTO HBS_EDIT_ERR_MESSAGE_CODE (HBS_EDIT_ERR_MESSAGE_CODE, HBS_EDIT_ERR_CATEGORY_CODE, HBS_EDIT_ERR_RESPONSIBLTY_CODE, DESCRIPTION, EFFECTIVE_DATE, EXPIRY_DATE, UPDATE_TIMESTAMP)
VALUES
('SD10', 'REL', 'M', 'No appraisal stumpage rate record exists for this scale date', DATE '2000-01-01', DATE '2099-12-31', DATE '2008-02-27'),
('SD11', 'BIL', 'M', 'More than one override rule in effect.', DATE '2000-01-01', DATE '2099-12-31', DATE '2008-02-27'),
('SD12', 'REL', 'M', 'Range of daily load and scale dates spans two mark rate periods and no override rate rule in effect', DATE '2000-01-01', DATE '2099-12-31', DATE '2008-02-27'),
('SD13', 'REL', 'M', 'Daily loads entered for a date greater than return scale date', DATE '2000-01-01', DATE '2099-12-31', DATE '2008-02-27'),
('SD16', 'FMT', 'M', 'There are duplicate days within a return', DATE '2000-01-01', DATE '2099-12-31', DATE '2008-02-27'),
('SDW01', 'SCL', 'I', 'Wt less Subsample Must be numeric and > Tare Weight', DATE '2000-01-01', DATE '2099-12-31', DATE '2008-02-27'),
('SG00', 'FMT', 'M', 'Obsolete - EDI input species and grade cannot be blank', DATE '2000-01-01', DATE '2005-11-30', DATE '2008-02-27'),
('SG01', 'LKP', 'M', 'Obsolete - EDI input species and grade combination is invalid', DATE '2000-01-01', DATE '2005-11-30', DATE '2008-02-27'),
('SG02', 'FMT', 'I', 'Species and grade combination is invalid', DATE '2000-01-01', DATE '2099-12-31', DATE '2008-02-27'),
('SGL01', 'SCL', 'I', 'Signing scaler licence does not exist in the Scale Control System (Quant License)', DATE '2000-01-01', DATE '2099-12-31', DATE '2008-02-27');
-- ...additional rows omitted for brevity, full file can be generated if needed
