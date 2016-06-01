import os
import json
import datetime
import webapp2
from time import mktime
from google.appengine.api import users

default_methods = webapp2.WSGIApplication.allowed_methods
allowed_methods = default_methods.union(('PATCH',))
webapp2.WSGIApplication.allowed_methods = allowed_methods

def to_epoch_ms(value):
    return mktime(value.utctimetuple()) * 1000

def from_epoch_ms(value):
    return datetime.utcfromtimestamp(value / 1000)

def _to_json(value):
    if isinstance(value, datetime.datetime):
        return to_epoch_ms(value)
    else:
        return value

def stringify(obj):
    return json.dumps(obj, default=_to_json)


class Endpoint(webapp2.RequestHandler):
    def __init__(self, request, response):
        self.initialize(request, response)
        self.user = users.get_current_user()
        self.user_id = self.user.user_id if self.user else None

    def read_json(self):
        return json.loads(self.request.body)


class App(webapp2.WSGIApplication):
    def __init__(self, *args, **kwargs):
        super(App, self).__init__(*args, **kwargs)
        self.router.set_dispatcher(self.__class__.custom_dispatcher)

    @staticmethod
    def custom_dispatcher(router, request, response):
        route, args, kwargs = rv = router.match(request)
        request.route, request.route_args, request.route_kwargs = rv

        if route.handler_adapter is None:
            handler = route.handler
            if isinstance(handler, basestring):
                if handler not in router.handlers:
                    router.handlers[handler] = handler = import_string(handler)
                else:
                    handler = router.handlers[handler]

            route.handler_adapter = router.adapt(handler)

        output = route.handler_adapter(request, response)
        if isinstance(output, webapp2.Response): return output
        if isinstance(output, int): return webapp2.Response(status = output)
        if isinstance(output, tuple): return webapp2.Response(output[1], output[0])
        output = webapp2.Response(stringify(output))
        output.headers['Content-Type'] = 'application/json'
        return output

    def route(self, url, mime = None, *args, **kwargs):
        def wrapper(handler):
            route = webapp2.Route(url, handler=handler, *args, **kwargs)
            route.mime = mime
            self.router.add(route)
            return handler
        return wrapper


app = App()
