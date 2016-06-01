from google.appengine.ext import ndb

class Palette(ndb.Model):
    title = ndb.StringProperty()
    colors = ndb.StringProperty(repeated=True)
