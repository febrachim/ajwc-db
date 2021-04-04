// import fs from 'fs-extra';
import { Country } from '../master/model/country';
import { Category, CategoryType } from '../master/model/category';
import { Company } from '../company/model/company';
import { People } from './model/people';
import { PeopleCompany, CompanyStatus } from './model/people_company';
import { Event } from '../event/model/event';
import { Note } from '../desc/model/note';
import { Document } from '../desc/model/document';
import { capitalize, error, errorJSON, formatStatus, genReport } from '../core/utils';
import { Messages } from './messages';
import { Hiring } from '../hiring/model/hiring';

const { peopleMsg } = Messages;

export const PeopleController = {};
export default { PeopleController };

PeopleController.addView = async (req, res) => {
  const getRoles = Category.getDropdown(CategoryType.ROLE);
  const [roles] = await Promise.all([getRoles]);
  const statuses = formatStatus(CompanyStatus);
  res.render('people/views/createPeople', { link: '/people', type: 'add', roles, statuses });
};

PeopleController.add = async (req, res, next) => {
  const { notes = [], email, contact, companies = [] } = req.body;
  const country = req.body.country_id === '0' ? undefined : req.body.country_id;
  const name = capitalize(req.body.name);
  if (email) {
    const check = await People.get({ email });
    if (check) return next(errorJSON('danger', peopleMsg.create_duplicate(email)));
  }
  const people = await People.forge({
    name, country_id: country, email, contact, user_id: req.user.id }).save();
  const insertNotes = notes.map(note => Note.forge({
    text: note,
    ref_id: people.get('id'),
    ref_type: 'peoples',
    user_id: req.user.id,
  }).save());

  const insertPeopleCompany = companies.map(company => PeopleCompany.forge({
    people_id: people.get('id'),
    company_id: company.id,
    status: company.status,
    title: company.title.trim() ? capitalize(company.title) : undefined,
    category_role_id: Number(company.role) || undefined,
    user_id: req.user.id,
  }).save());

  await Promise.all([...insertNotes, ...insertPeopleCompany]);
  req.resData = {
    input: {
      ref_id: people.get('id'),
      ref_type: 'peoples',
      msg: peopleMsg.create_success(name),
      redirect: '/people',
    },
    link: '/upload' };
  return next();
};

PeopleController.editView = async (req, res, next) => {
  const getRoles = Category.getDropdown(CategoryType.ROLE);
  const people = await People.get({ id: req.params.id }, ['peopleCompanies.company',
    'country',
    { notes: qb => qb.where('deleted_at', null).orderBy('id', 'desc') },
    'notes.createdBy',
    { documents: qb => qb.where('deleted_at', null) },
    'documents.createdBy']);
  if (!people) return next(error('danger', peopleMsg.not_found, '/people'));
  const statuses = formatStatus(CompanyStatus);
  const [roles] = await Promise.all([getRoles]);
  res.render('people/views/createPeople', {
    link: '/people',
    type: 'edit',
    notes: people.related('notes').serialize(),
    documents: people.related('documents').serialize(),
    people: people.serialize(),
    roles,
    statuses,
  });
};

PeopleController.edit = async (req, res, next) => {
  const { country_id: countryId,
    email,
    contact,
    notes = [],
    companies = [],
    edited = [],
    deleted = [],
    deletedNote = [],
    deletedDoc = [],
    editedNote = [] } = req.body;
  const name = capitalize(req.body.name);
  const getCheck = email ? People.get({ email }) : '';
  const [check, people] = await Promise
    .all([getCheck, People.get({ id: req.params.id })]);
  if (email && check && check.get('id') !== people.get('id')) return next(errorJSON('danger', peopleMsg.create_duplicate(email)));
  if (!people) return next(errorJSON('danger', peopleMsg.not_found));
  const insertPeopleCompany = companies.map(company => PeopleCompany.forge({
    people_id: people.get('id'),
    company_id: company.id,
    status: company.status,
    title: company.title.trim() ? capitalize(company.title) : undefined,
    category_role_id: Number(company.role) || undefined,
    user_id: req.user.id,
  }).save());
  const editPeopleCompany = edited.map(company => PeopleCompany.where({ id: company.id }).save({
    company_id: company.company_id,
    status: company.status,
    title: company.title.trim() ? capitalize(company.title) : undefined,
    category_role_id: Number(company.role) || undefined,
  }, { patch: true }));
  const deletePeopleCompany = deleted.map(id => PeopleCompany.where({ id }).destroy());
  const insertNotes = notes.map(note => Note.forge({
    text: note,
    ref_id: people.get('id'),
    ref_type: 'peoples',
    user_id: req.user.id,
  }).save());
  const deleteNotes = deletedNote.map(id => Note.softDelete(id, req.user.id));
  // const deleteFiles = [];
  const deleteDocs = Document.softDelete(deletedDoc, req.user.id);
  const editNotes = editedNote.map(note => Note.edit(note, req.user.id));
  const updatePeople = People.where({ id: req.params.id }).save({
    name, country_id: countryId, contact, email, user_id: req.user.id }, { patch: true });
  await Promise.all([
    ...insertPeopleCompany,
    ...editPeopleCompany,
    ...deletePeopleCompany,
    ...insertNotes,
    ...editNotes,
    ...deleteNotes,
    ...deleteDocs,
    // ...deleteFiles,
    updatePeople]);
  req.resData = {
    input: {
      ref_id: people.get('id'),
      ref_type: 'peoples',
      msg: peopleMsg.edit_success,
      redirect: '/people',
    },
    link: '/upload' };
  return next();
};

PeopleController.detail = async (req, res, next) => {
  const { page = 1, pageSize = 10, sort, order, candidate } = req.query;

  const getPeople = People.get({ id: req.params.id }, ['country',
    { notes: qb => qb.where('deleted_at', null).orderBy('id', 'desc') },
    'notes.createdBy',
    { documents: qb => qb.where('deleted_at', null) },
    'documents.createdBy']);

  const getCurrentCompany = PeopleCompany.getAll({ people_id: req.params.id, status: CompanyStatus.CURRENT }, null, ['role', 'rel', 'company']);
  const getPastCompany = PeopleCompany.getAll({ people_id: req.params.id, status: CompanyStatus.PAST }, null, ['role', 'rel', 'company']);
  const people = await getPeople;

  const getOpenings = Hiring.getOpeningsByPeople(req.params.id, { page, pageSize }, ['company', 'hiringStatus', 'createdBy']);

  if (!people) return next(error('danger', peopleMsg.not_found, '/people'));
  const [current, past, openings] = await Promise.all([getCurrentCompany, getPastCompany, getOpenings]);

  res.render('people/views/detailPeople', {
    link: '/people',
    notes: people.related('notes').serialize(),
    status: CompanyStatus,
    openings: openings.serialize({ job: true }),
    companies: { current: current.serialize(), past: past.serialize() },
    documents: people.related('documents').serialize(),
    people: people.serialize(),
  });
};

PeopleController.viewAll = title => async (req, res) => {
  const { page = 1, countries, companies, pageSize = 10, sort, order,
    roles: roleQ = [], event: eventId } = req.query;

  const getPeople = People.getAll(req.query, { page, pageSize },
    [{ peopleCompany: qb => qb.where('deleted_at', null).orderBy('status').orderBy('id', 'desc') },
      'peopleCompany.company', 'createdBy', 'peopleCompany.role' ]);
  const getCountries = countries
    ? Promise.all(countries.map(id => Country.get({ id }, ['id', 'name']))) : [];
  const getCompanies = companies
    ? Promise.all(companies.map(id => Company.get({ id }, [], ['id', 'name']))) : [];

  const getRoles = Category.getDropdown(CategoryType.ROLE);
  const getEvent = eventId ? Event.get({ id: eventId }) : undefined;
  const [people, selectedCountries, roles, selectedCompanies, event] =
    await Promise.all([getPeople, getCountries, getRoles, getCompanies, getEvent]);

  res.render('people/views/viewPeople', {
    link: title === 'People' ? '/people' : '/people',
    linkCompanies: '/companies',
    items: people.serialize(),
    title,
    countries: selectedCountries,
    companies: selectedCompanies,
    queries: req.query,
    ...people.pagination,
    roles,
    selectedRoles: roleQ,
    sort,
    order,
    event: event && event.serialize({ api: true }),
  });
};

PeopleController.export = type => async (req, res) => {
  const { page = 1, pageSize = 100, event } = req.query;
  const withRelated = [{ peopleCompany: qb => qb.where('deleted_at', null).orderBy('status').orderBy('id', 'desc') },
    'peopleCompany.company', 'peopleCompany.role.parent', 'createdBy', 'notes', 'documents', 'country'];
  if (type === 'invitees') {
    withRelated.push({ peopleEvent: (qb) => {
      if (event) qb.where('event_id', event);
    } },
      'peopleEvent.event');
  }
  const people = await People.getAll(req.query, { page, pageSize }, withRelated);
  let data = People.formatExport(people.serialize({ forExport: true }), type);
  let cols;
  if (type === 'people') {
    // delete undefined prop
    data = JSON.parse(JSON.stringify(data));
    cols = ['Name', 'Email', 'Contact', 'Country', 'Company', 'Role', 'Title', 'Created At', 'Edited At', 'Last Edited By', 'Notes', 'Documents'];
  }
  if (type === 'invitees') cols = ['Event', 'Venue', 'Event Date', 'Name', 'Email', 'Contact', 'Country', 'Company', 'Role', 'Title', 'Created At', 'Edited By', 'Last Edited By', 'Notes', 'Documents'];
  const name = `${type} Page ${page}`;
  res.attachment(`${name.toLowerCase()}.xlsx`);
  return res.send(genReport(data, cols, name));
};

PeopleController.listPeople = async (req, res, next) => {
  const { q = '', page } = req.query;
  const people = await People.getRegex(q, { page }, req.params.id);
  const { pagination } = people;
  req.resData = { data: people.serialize({ api: true }), meta: pagination };
  return next();
};

PeopleController.delete = async (req, res) => {
  const { id } = req.params;
  await People.where({ id }).save({ deleted_at: new Date() }, { patch: true });
  req.flash('success', peopleMsg.delete_success);
  return res.redirect('/people');
};
