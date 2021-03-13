from ._version import __version__


def _jupyter_server_extension_paths():
    return [{"module": "jupyterlab_pullrequests"}]


def load_jupyter_server_extension(lab_app):
    """Registers the API handler to receive HTTP requests from the frontend extension.

    Parameters
    ----------
    lab_app: jupyterlab.labapp.LabApp
        JupyterLab application instance
    """
    from .base import PRConfig
    from .handlers import setup_handlers

    config = PRConfig(config=lab_app.config)
    setup_handlers(lab_app.web_app, config)
    lab_app.log.info("Registered jupyterlab_pullrequests extension")
