export const Messages = {
  companyMsg: {
    create_success: name => `<strong>${name}</strong> has been added to company`,
    create_duplicate: name => `<strong>${name}</strong> is already created`,
    not_found: 'Company not found',
    edit_success: 'Edit company success',
    delete_success: 'Delete company success',
  },
  validateMsg: {
    country_id: '^Country needs to be selected',
    sector_ids: '^Sector needs to be selected',
  },
};

export default { Messages };
