from ._version import __version__, __js__

def _jupyter_labextension_paths():
    return [{"src": "labextension", "dest": __js__["name"]}]


def _jupyter_server_extension_points():
    return [{"module": "jupyterlab_pullrequests"}]


def _load_jupyter_server_extension(server_app):
    """Registers the API handler to receive HTTP requests from the frontend extension.

    Parameters
    ----------
    server_app: jupyterlab.labapp.LabApp
        JupyterLab application instance
    """
    from .base import PRConfig
    from .handlers import setup_handlers

    config = PRConfig(config=server_app.config)
    setup_handlers(server_app.web_app, config)
    server_app.log.info("Registered jupyterlab_pullrequests extension")


# for legacy launching with notebok (e.g. Binder)
_jupyter_server_extension_paths = _jupyter_server_extension_points
load_jupyter_server_extension = _load_jupyter_server_extension
