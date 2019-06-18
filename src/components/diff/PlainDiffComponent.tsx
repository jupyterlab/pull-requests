import { IThemeManager } from "@jupyterlab/apputils";
import * as d3 from "d3-color";
import { isUndefined } from "lodash";
import * as monaco from "monaco-editor";
import * as React from "react";
import { PullRequestCommentThreadModel, PullRequestFileModel, PullRequestPlainDiffCommentThreadModel } from "../../models";

export interface IPlainDiffComponentState {
  diffEditor: monaco.editor.IStandaloneDiffEditor;
  comments: PullRequestPlainDiffCommentThreadModel[];
}

export interface IPlainDiffComponentProps {
  data: PullRequestFileModel;
  themeManager: IThemeManager;
}

export class PlainDiffComponent extends React.Component<
  IPlainDiffComponentProps,
  IPlainDiffComponentState
> {
  constructor(props: IPlainDiffComponentProps) {
    super(props);
    this.state = { diffEditor: null, comments: null };
  }

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
    // automaticLayout may not be optimal, see https://github.com/Microsoft/monaco-editor/issues/28
    // Perhaps add div resize listener? See http://marcj.github.io/css-element-queries/
    const options: monaco.editor.IDiffEditorConstructionOptions = {
      readOnly: true,
      selectionHighlight: false,
      scrollBeyondLastLine: false,
      automaticLayout: true,
      renderLineHighlight: "gutter",
      glyphMargin: false
      // renderSideBySide: false
    };

    const language = this.getLanguage(this.props.data.extension);
    let baseModel = monaco.editor.createModel(this.props.data.basecontent, language);
    let headModel = monaco.editor.createModel(this.props.data.headcontent, language);
    this.updateTheme();
    monaco.editor.setTheme("PlainDiffComponent");

    let diffEditor = monaco.editor.createDiffEditor(
      document.getElementById(`monacocontainer-${this.props.data.id}`),
      options
    );
    diffEditor.setModel({
      original: baseModel,
      modified: headModel
    });

    this.props.themeManager.themeChanged.connect(() => this.updateTheme());
    this.setState({diffEditor: diffEditor}, () => { this.addComments(diffEditor) });
  }

  private addComments(diffEditor: monaco.editor.IStandaloneDiffEditor) {
    let pdcomments: PullRequestPlainDiffCommentThreadModel[] = [];
    for (let comment of this.props.data.comments) {
      const pdcomment = new PullRequestPlainDiffCommentThreadModel(
        new PullRequestCommentThreadModel(this.props.data, comment),
        diffEditor
      );
      pdcomments.push(pdcomment);
    }
    this.setState({comments: pdcomments});
  }

  componentDidMount() {
    this.addMonacoEditor();
  }

  render() {
    return (
      <div
        id={`monacocontainer-${this.props.data.id}`}
        style={{ height: "100%", width: "100%" }}
      />
    );
  }
}
