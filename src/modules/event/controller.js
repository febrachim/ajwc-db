import { Event } from './model/event';
import { PeopleEvent } from './model/people_event';
import { People } from '../people/model/people';
import { Note } from '../desc/model/note';
import { Document } from '../desc/model/document';
import { capitalize, error, errorJSON, genReport } from '../core/utils';
import { Messages } from './messages';

const { eventMsg } = Messages;

export const EventController = {};
export default { EventController };

EventController.addView = async (req, res) => {
  res.render('event/views/createEvent', { link: '/events', type: 'add' });
};

EventController.add = async (req, res, next) => {
  const { invitees = [], date, notes = [] } = req.body;
  const [name, venue] = capitalize([req.body.name, req.body.venue || '']);
  const event = await Event.forge({
    name, date: date || undefined, venue, user_id: req.user.id }).save();

  const insertNotes = notes.map(note => Note.forge({
    text: note,
    ref_id: event.get('id'),
    ref_type: 'events',
    user_id: req.user.id,
  }).save());

  const insertInvitees = invitees.map(id => PeopleEvent.forge({ event_id: event.get('id'), people_id: id }).save());
  await Promise.all([...insertNotes, ...insertInvitees]);
  req.resData = {
    input: {
      ref_id: event.get('id'),
      ref_type: 'events',
      msg: eventMsg.create_success(name),
      redirect: '/events',
    },
    link: '/upload' };
  return next();
};

EventController.editView = async (req, res, next) => {
  const event = await Event.get({ id: req.params.id }, ['peoples',
    { notes: qb => qb.where('deleted_at', null).orderBy('id', 'desc') },
    'notes.createdBy',
    { documents: qb => qb.where('deleted_at', null) },
    'documents.createdBy']);

  if (!event) return next(error('danger', eventMsg.not_found, '/events'));
  res.render('event/views/createEvent', {
    link: '/events',
    type: 'edit',
    notes: event.related('notes').serialize(),
    documents: event.related('documents').serialize(),
    event: event.serialize(),
  });
};

EventController.edit = async (req, res, next) => {
  const { date,
    invitees = [],
    notes = [],
    deletedNote = [],
    deletedDoc = [],
    editedNote = [] } = req.body;
  const [name, venue] = capitalize([req.body.name, req.body.venue || '']);
  const [event] = await Promise.all([Event.get({ id: req.params.id })]);
  if (!event) return next(errorJSON('danger', eventMsg.not_found, '/events'));
  const deleteInvitees = PeopleEvent.where('event_id', event.get('id')).destroy();
  const insertNotes = notes.map(note => Note.forge({
    text: note,
    ref_id: event.get('id'),
    ref_type: 'events',
    user_id: req.user.id,
  }).save());
  const deleteNotes = deletedNote.map(id => Note.softDelete(id, req.user.id));
  // const deleteFiles = [];
  const deleteDocs = deletedDoc.map(doc => Document.softDelete(doc, req.user.id));
  const editNotes = editedNote.map(note => Note.edit(note, req.user.id));
  const updateEvent = Event.where({ id: req.params.id })
    .save({ name, date: date || undefined, venue, user_id: req.user.id }, { patch: true });
  await deleteInvitees;
  const insertInvitees = invitees.map(id => PeopleEvent.forge({ event_id: event.get('id'), people_id: id }).save());
  await Promise.all([
    ...insertNotes,
    ...insertInvitees,
    ...editNotes,
    ...deleteNotes,
    ...deleteDocs,
    // ...deleteFiles,
    updateEvent]);
  req.resData = {
    input: {
      ref_id: event.get('id'),
      ref_type: 'events',
      msg: eventMsg.edit_success,
      redirect: '/events',
    },
    link: '/upload' };
  return next();
};

EventController.detail = async (req, res, next) => {
  const getEvent = Event.get({ id: req.params.id }, [
    { notes: qb => qb.where('deleted_at', null).orderBy('id', 'desc') },
    'notes.createdBy',
    { documents: qb => qb.where('deleted_at', null) },
    'documents.createdBy']);
  const [event] = await Promise.all([getEvent]);
  if (!event) return next(error('danger', eventMsg.not_found, '/events'));
  res.render('event/views/detailEvent', {
    link: '/events',
    notes: event.related('notes').serialize(),
    documents: event.related('documents').serialize(),
    event: event.serialize({ dateText: true }),
  });
};

EventController.viewAll = async (req, res) => {
  const { page = 1, pageSize = 10, sort, order, invitee } = req.query;
  const getEvents = Event.getAll(req.query, { page, pageSize }, ['createdBy']);
  const getInvitee = !invitee ? undefined
    : People.get({ id: invitee }).then(result => result.serialize({ api: true }));
  const [events, theInvitee] = await Promise.all([getEvents, getInvitee]);
  res.render('event/views/viewEvent', {
    link: '/events',
    items: events.serialize(),
    title: 'Event',
    queries: req.query,
    ...events.pagination,
    invitee: theInvitee,
    sort,
    order,
  });
};

EventController.export = async (req, res) => {
  const { page = 1, pageSize = 10 } = req.query;
  const events = await Event.getAll(req.query, { page, pageSize }, ['createdBy', 'peoples',
    { notes: qb => qb.where('deleted_at', null).orderBy('user_id').orderBy('id', 'desc') },
    { documents: qb => qb.where('deleted_at', null) }]);
  const cols = ['Name', 'Venue', 'Date', 'Invitees', 'Created At', 'Edited At', 'Last Edited By', 'Notes', 'Documents'];
  const data = Event.formatExport(events.serialize({ dateText: true, forExport: true }));
  const name = `Events Page ${page}`;
  res.attachment(`${name.toLowerCase()}.xlsx`);
  return res.send(genReport(data, cols, name));
};

EventController.listEvents = async (req, res, next) => {
  const q = req.query.q;
  const companies = await Event.getRegex(q);
  req.resData = { data: companies.serialize({ api: true }) };
  return next();
};

EventController.delete = async (req, res) => {
  const { id } = req.params;
  await Event.where({ id }).save({ deleted_at: new Date() }, { patch: true });
  req.flash('success', eventMsg.delete_success);
  return res.redirect('/events');
};
