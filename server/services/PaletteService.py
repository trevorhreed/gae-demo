from server.data import Palette
from google.appengine.ext import ndb
from google.net.proto.ProtocolBuffer import ProtocolBufferDecodeError

# PUBLIC

def all(parent_key):
    models = Palette.query(ancestor=parent_key)
    return _serialize_all(models)

def get(id):
    model = _get(id)
    if model is None: return None
    return _serialize(model)

def put(entity, parent_key):
    model = _get(entity['id']) if 'id' in entity else Palette(parent=parent_key)
    if 'id' in entity: del entity['id']
    model.populate(**entity)
    model.put()
    return _serialize(model)

def delete(id):
    try:
        ndb.Key(urlsafe=id).delete()
        return id
    except ProtocolBufferDecodeError:
        return None


# PRIVATE

def _get(id):
    try:
        return ndb.Key(urlsafe=id).get()
    except ProtocolBufferDecodeError:
        return None

def _serialize(model):
    entity = {
        'title': model.title,
        'colors': model.colors
    }
    if model.key: entity['id'] = model.key.urlsafe()
    return entity

def _serialize_all(models):
    return [_serialize(x) for x in models]
