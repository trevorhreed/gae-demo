@core.app.route('/api/ping')
class PingApi(core.Endpoint):
    def get(self):
        return 'pong'

@core.app.route('/api/settings')
class AppSettings(core.Endpoint):
    def get(self):
        user = users.get_current_user()
        nickname = user.nickname() if user else 'Anonymous'
        return {
            'logoutUrl': users.create_logout_url('/'),
            'nickname': nickname
        }

@core.app.route('/api/palettes')
class PalettesApi(core.Endpoint):
    def get(self):
        return PaletteService.all()

    def post(self):
        return PaletteService.put(self.entity)

@core.app.route('/api/palettes/<id>')
class PaletteApi(core.Endpoint):
    def get(self, id):
        return PaletteService.get(id)

    def put(self, id):
        return PaletteService.put(self.entity)

    def delete(self, id):
        return PaletteService.delete(id)
