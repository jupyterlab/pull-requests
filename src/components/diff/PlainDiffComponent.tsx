import { IThemeManager } from "@jupyterlab/apputils";
import * as d3 from "d3-color";
import { isNull, isUndefined } from "lodash";
import * as monaco from "monaco-editor";
import * as React from "react";
import ReactResizeDetector from 'react-resize-detector';
import { PullRequestCommentThreadModel, PullRequestFileModel, PullRequestPlainDiffCommentThreadModel } from "../../models";

export interface IPlainDiffComponentState {
  diffEditor: monaco.editor.IStandaloneDiffEditor;
  comments: PullRequestPlainDiffCommentThreadModel[];
  decorations: string[];
}

export interface IPlainDiffComponentProps {
  file: PullRequestFileModel;
  themeManager: IThemeManager;
}

export class PlainDiffComponent extends React.Component<
  IPlainDiffComponentProps,
  IPlainDiffComponentState
> {
  constructor(props: IPlainDiffComponentProps) {
    super(props);
    this.state = { diffEditor: null, comments: [], decorations: [] };
  }

  componentDidMount() {
    this.addMonacoEditor();
  }

  onResize = () => {
    if (!isNull(this.state.diffEditor)) {
      this.state.diffEditor.layout();
    }
  }

  render() {
    return (
      <div style={{ height: "100%", width: "100%" }}>
        <div
          id={`monacocontainer-${this.props.file.id}`}
          style={{ height: "100%", width: "100%" }}
        />
        <ReactResizeDetector handleWidth={true} handleHeight={true} onResize={this.onResize} />
      </div>
    );
  }

  // -----------------------------------------------------------------------------
  // Monaco
  // -----------------------------------------------------------------------------

  private getLanguage(ext: string): string {
    const langs = monaco.languages.getLanguages();
    for (let lang of langs) {
      if (lang["extensions"].indexOf(ext) !== -1) {
        if (!isUndefined(lang["mimetypes"]) && lang["mimetypes"].length > 0) {
          return lang["mimetypes"][0];
        } else {
          return lang["id"];
        }
      }
    }
    return "text/plain";
  }

  private getVariableHex(varname: string): string {
    return d3.color(
      getComputedStyle(document.body)
        .getPropertyValue(varname)
        .trim()
    ).hex();
  }

  private updateTheme() {
    let isLight: boolean = this.props.themeManager.isLight(
      this.props.themeManager.theme
    );
    monaco.editor.defineTheme("PlainDiffComponent", {
      base: isLight ? "vs" : "vs-dark",
      inherit: true,
      colors: {
        "editor.background": this.getVariableHex("--jp-layout-color1"),
        "editor.lineHighlightBorder": this.getVariableHex("--jp-layout-color1"),
        "editorLineNumber.foreground": this.getVariableHex("--jp-ui-font-color2"),
        "editorGutter.background": this.getVariableHex("--jp-layout-color1"),
        "diffEditor.insertedTextBackground": "#C9F3C24D", // #80
        "diffEditor.removedTextBackground": "#FF96964D"
      },
      rules: []
    });
  }

  private addMonacoEditor() {
    const options: monaco.editor.IDiffEditorConstructionOptions = {
      readOnly: true,
      selectionHighlight: false,
      scrollBeyondLastLine: false,
      renderLineHighlight: "gutter",
      glyphMargin: false,
      renderFinalNewline: false
      // renderSideBySide: false
    };

    const language = this.getLanguage(this.props.file.extension);
    let baseModel = monaco.editor.createModel(this.props.file.basecontent, language);
    let headModel = monaco.editor.createModel(this.props.file.headcontent, language);
    this.updateTheme();
    monaco.editor.setTheme("PlainDiffComponent");

    let diffEditor = monaco.editor.createDiffEditor(
      document.getElementById(`monacocontainer-${this.props.file.id}`),
      options
    );
    diffEditor.setModel({
      original: baseModel,
      modified: headModel
    });

    this.props.themeManager.themeChanged.connect(() => this.updateTheme());
    this.setState({diffEditor: diffEditor}, () => {
      this.initComments();
      this.handleMouseEvents();
    });
  }

  private initComments() {
    let pdcomments: PullRequestPlainDiffCommentThreadModel[] = [];
    for (let thread of this.props.file.comments) {
      const pdcomment = new PullRequestPlainDiffCommentThreadModel(
        new PullRequestCommentThreadModel(this.props.file, thread.comment),
        this
      );
      pdcomments.push(pdcomment);
    }
    this.setState({comments: pdcomments});
  }

  private addComment(commentToAdd: PullRequestPlainDiffCommentThreadModel) {
    this.setState(prevState => ({
      comments: [...prevState.comments, commentToAdd]
    }))
  }

  removeComment(commentToRemove: PullRequestPlainDiffCommentThreadModel) {
    this.setState(prevState => ({
      comments: [...prevState.comments.filter(comment => comment !== commentToRemove)]
    }), () => {
      commentToRemove.deleteComment();
    });
  }

  private handleMouseEvents() {
    // Show add comment decoration on mouse move
    this.state.diffEditor.getModifiedEditor().onMouseMove((e) => {
      if (!isNull(e.target["position"])) {
        this.updateCommentDecoration(e.target["position"]["lineNumber"]);
      } else if (this.state.decorations.length > 0 && e.target["type"] == 12) {
        this.removeCommentDecoration();
      }
    });
    // Remove add comment decoration if mouse leaves
    this.state.diffEditor.getModifiedEditor().onMouseLeave((e) => {
      this.removeCommentDecoration();
    });
    this.state.diffEditor.getModifiedEditor().onMouseDown((e) => {
      if (e.target["element"]["classList"].contains("jp-PullRequestCommentDecoration")) {
        this.addComment(new PullRequestPlainDiffCommentThreadModel(
          new PullRequestCommentThreadModel(
            this.props.file,
            parseInt(e.target["element"]["parentElement"]["innerText"])
          ),
          this
        ))
      }
    });
  }

  private updateCommentDecoration(lineNumber: number) {
    let newDecorations = this.state.diffEditor.getModifiedEditor().deltaDecorations(this.state.decorations, [
      {
        range: new monaco.Range(lineNumber,1,lineNumber,1),
        options: {
          isWholeLine: true,
          linesDecorationsClassName: 'jp-PullRequestCommentDecoration'
        }
      },
    ])
    this.setState({decorations: newDecorations});
  }

  private removeCommentDecoration() {
    if (this.state.decorations.length > 0) {
      let newDecorations = this.state.diffEditor.getModifiedEditor().deltaDecorations(this.state.decorations, []);
      this.setState({decorations: newDecorations});
    }
  }
}
