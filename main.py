import webapp2
import json
import datetime
from time import mktime
from google.appengine.ext import ndb
from google.net.proto.ProtocolBuffer import ProtocolBufferDecodeError

class Palette(ndb.Model):
    title = ndb.StringProperty()
    colors = ndb.StringProperty(repeated=True)

class PaletteService:

    @classmethod
    def _get(cls, id):
        try:
            return ndb.Key(urlsafe=id).get()
        except ProtocolBufferDecodeError:
            return None

    @classmethod
    def _serialize(cls, model):
        entity = {
            'title': model.title,
            'colors': model.colors
        }
        if model.key: entity['id'] = model.key.urlsafe()
        return entity

    @classmethod
    def _serialize_all(cls, models):
        return [cls._serialize(x) for x in models]

    @classmethod
    def all(cls):
        models = Palette.query()
        return cls._serialize_all(models)

    @classmethod
    def get(cls, id):
        model = cls._get(id)
        if model is None: return None
        return cls._serialize(model)

    @classmethod
    def put(cls, entity):
        model = cls._get(entity['id']) if 'id' in entity else Palette()
        model.populate(**entity)
        model.put()
        return cls._serialize(model)

    @classmethod
    def delete(cls, id):
        try:
            ndb.Key(urlsafe=id).delete()
            return id
        except ProtocolBufferDecodeError:
            return None

def to_epoch_ms(value):
    return mktime(value.utctimetuple()) * 1000

def from_epoch_ms(value):
    return datetime.utcfromtimestamp(value / 1000)

def _default(value):
    if isinstance(value, datetime.datetime):
        return to_epoch_ms(value)
    else:
        return value

def to_json(obj):
    return json.dumps(obj, default=_default)

class PingApi(webapp2.RequestHandler):
    def get(self):
        self.response.write('pong')

class LoginApi(webapp2.RequestHandler):
    def post(self):
        body = json.loads(self.request.body)
        if body['username'] == 'user' and body['password'] == 'pass':
            self.response.write('success')
        else:
            sef.response.set_status(400)
            self.response.write('failure')

class PalettesApi(webapp2.RequestHandler):
    def get(self):
        entities = PaletteService.all()
        self.response.write(to_json(entities))

    def post(self):
        entity = json.loads(self.request.body)

        entity = PaletteService.put(entity)
        self.response.write(to_json(entity))

class PaletteApi(webapp2.RequestHandler):
    def get(self, id):
        entity = PaletteService.get(id)
        import logging
        logging.info(entity)
        self.response.write(to_json(entity))

    def put(self, id):
        entity = json.loads(self.request.body)
        entity = PaletteService.put(entity)
        self.response.write(to_json(entity))

    def delete(self, id):
        id = PaletteService.delete(id)
        self.response.write(to_json(id))


app = webapp2.WSGIApplication([
    ('/api/auth/login', LoginApi),
    webapp2.Route('/api/palettes', PalettesApi),
    webapp2.Route('/api/palettes/<id>', PaletteApi),
    ('/api/ping', PingApi)
], debug=True)
